import { useCallback, useRef, useState } from "react";
import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { schema } from "@/lib/collab/schema";

export function useEditorInsertion(editorViewRef: React.RefObject<EditorView | null>) {
  const placeholderRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [isPendingAccept, setIsPendingAccept] = useState<boolean>(false);
  const isPendingAcceptRef = useRef<boolean>(false);

  // Function to insert text at a specific line number and cursor position
  const insertTextAtParagraph = useCallback((
    lineNumber: number, 
    cursorPosition?: number,
    textToInsert: string = `Text inserted at line ${lineNumber}!`
  ) => {
    const editorView = editorViewRef.current;
    if (!editorView) return;

    let targetParagraphStart = 0;
    let targetParagraphEnd = 0;
    let paragraphCount = 0;
    let lastParagraphPos = 0;
    
    // Count paragraphs and track positions
    editorView.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        paragraphCount++;
        lastParagraphPos = pos + node.nodeSize;
        if (paragraphCount === lineNumber) {
          targetParagraphStart = pos + 1; // +1 to skip opening tag
          targetParagraphEnd = pos + node.nodeSize - 1; // -1 to exclude closing tag
          return false; // stop iterating
        }
      }
    });
    
    let transaction = editorView.state.tr;
    
    // If we have fewer paragraphs than needed, create the missing ones
    if (paragraphCount < lineNumber) {
      const paragraphsNeeded = lineNumber - paragraphCount;
      const insertPos = lastParagraphPos || editorView.state.doc.content.size;
      
      // Create empty paragraphs
      for (let i = 0; i < paragraphsNeeded; i++) {
        const emptyParagraph = schema.node('paragraph');
        transaction = transaction.insert(insertPos + (i * 2), emptyParagraph);
      }
      
      // Calculate position of the target paragraph after insertion
      targetParagraphStart = insertPos + (paragraphsNeeded * 2) - 1;
      targetParagraphEnd = targetParagraphStart;
    }
    
    // Get document size from the transaction's document (after any paragraph creation)
    const docSize = transaction.doc.content.size;
    
    // Validate and clamp paragraph bounds
    targetParagraphStart = Math.max(0, Math.min(targetParagraphStart, docSize));
    targetParagraphEnd = Math.max(targetParagraphStart, Math.min(targetParagraphEnd, docSize));
    
    // Determine the actual insertion position
    let insertPos = targetParagraphEnd;
    let finalTextToInsert = textToInsert;
    
    if (cursorPosition !== undefined && cursorPosition >= 0) {
      // Use cursor position within the paragraph
      insertPos = targetParagraphStart + cursorPosition;
      
      // Ensure insertPos doesn't exceed document bounds
      if (insertPos > docSize) {
        console.warn('Insert position out of range', { insertPos, docSize });
        insertPos = docSize;
      }
      
      // Ensure insertPos doesn't exceed paragraph bounds
      if (insertPos > targetParagraphEnd) {
        insertPos = targetParagraphEnd;
      }
      
      // Normalize spaces (treat regular space and non-breaking space as equal)
      const normalizeText = (text: string) => {
        return text.split('').map(char => {
          const code = char.charCodeAt(0);
          return code === 160 ? ' ' : char;
        }).join('');
      };
      
      // Check if the text to insert contains a prefix that matches existing content before cursor
      if (cursorPosition > 0) {
        // Ensure we don't read beyond document bounds
        const safeInsertPos = Math.min(insertPos, docSize);
        const safeStartPos = Math.min(targetParagraphStart, docSize);
        
        // Only read if we have a valid range
        if (safeStartPos < safeInsertPos && safeStartPos >= 0 && safeInsertPos <= docSize) {
          const existingPrefix = transaction.doc.textBetween(safeStartPos, safeInsertPos);
          const prefixLength = Math.min(textToInsert.length, existingPrefix.length);
          const insertPrefix = textToInsert.substring(0, prefixLength);
          
          const normalizedExisting = normalizeText(existingPrefix);
          const normalizedInsert = normalizeText(insertPrefix);
          
          if (normalizedExisting === normalizedInsert) {
            // The text to insert contains a matching prefix, skip it
            finalTextToInsert = textToInsert.substring(prefixLength);
            console.log('Skipping matching prefix', {
              existingPrefix,
              insertPrefix,
              remainingText: finalTextToInsert,
            });
          } else if (normalizedExisting.startsWith(normalizedInsert)) {
            // The entire text to insert is a prefix of existing text - skip it
            finalTextToInsert = textToInsert.substring(textToInsert.length);
          }
        }
      }
      
      // If there's no text left to insert, return
      if (finalTextToInsert.length === 0) {
        console.log('No new text to insert after prefix matching');
        return;
      }
      
      // Check for conflicts: see if inserted text would overwrite non-matching content
      const safeParagraphEnd = Math.min(targetParagraphEnd, docSize);
      const existingTextLength = Math.max(0, safeParagraphEnd - insertPos);
      const overlapLength = Math.min(finalTextToInsert.length, existingTextLength);
      
      if (overlapLength > 0 && insertPos >= 0 && insertPos < docSize) {
        // Ensure we don't read beyond document bounds
        const safeEndPos = Math.min(insertPos + overlapLength, docSize);
        const actualOverlapLength = safeEndPos - insertPos;
        
        // Only read if we have a valid range
        if (actualOverlapLength > 0 && insertPos < safeEndPos) {
          // Get the existing text that would be overlapped
          const existingText = transaction.doc.textBetween(insertPos, safeEndPos);
          const overlappingInsertText = finalTextToInsert.substring(0, actualOverlapLength);
          
          const normalizedExisting = normalizeText(existingText);
          const normalizedInsert = normalizeText(overlappingInsertText);
          
          if (normalizedExisting !== normalizedInsert) {
            console.log('conflict', {
              existingText,
              overlappingInsertText,
              position: insertPos,
              lineNumber,
              cursorPosition,
            });
            return; // Don't insert if there's a conflict
          }
          
          // Text matches! Skip the overlapping portion in the text to insert
          console.log('Skipping matching overlap', {
            actualOverlapLength,
            existingText,
            overlappingInsertText,
          });
          finalTextToInsert = finalTextToInsert.substring(actualOverlapLength);
          insertPos = safeEndPos; // Move insert position past the matching text
        }
      }
    }
    
    // If there's no text left to insert after overlap matching, return
    if (finalTextToInsert.length === 0) {
      console.log('No new text to insert after overlap matching');
      return;
    }
    
    // Final validation: ensure insertPos is within valid range
    const finalDocSize = transaction.doc.content.size;
    insertPos = Math.max(0, Math.min(insertPos, finalDocSize));
    
    // Insert the text with placeholder mark at the target position
    const placeholderMark = schema.marks.placeholder.create();

    console.log('inserting text', finalTextToInsert);
    console.log('placeholder mark', placeholderMark);
    
    transaction = transaction.insert(
      insertPos,
      schema.text(finalTextToInsert, [placeholderMark])
    );
    
    // Store the range of the placeholder text
    placeholderRangeRef.current = {
      from: insertPos,
      to: insertPos + finalTextToInsert.length,
    };
    
    // Set pending accept state to true
    setIsPendingAccept(true);
    isPendingAcceptRef.current = true;
    
    // Set cursor at the start of the inserted text
    transaction = transaction.setSelection(
      TextSelection.create(transaction.doc, insertPos)
    );
    
    editorView.dispatch(transaction);
  }, [editorViewRef]);

  return {
    insertTextAtParagraph,
    placeholderRangeRef,
    isPendingAccept,
    setIsPendingAccept,
    isPendingAcceptRef,
  };
}

