import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProsemirrorNode, Mark } from "prosemirror-model";
import { toast } from "sonner";

interface FilePageLinkPluginOptions {
  scrollToPageRef: ((pageNumber: number) => void) | null;
  isRightOpen: boolean;
  openRight: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setActiveView: (view: "chat" | "files") => void;
  selectFile: (fileId: string) => Promise<void>;
  currentFileId: string | null;
}

// Utility function to extract page number from various formats
const extractPageNumber = (text: string): number | null => {
  // Handle various formats:
  // "19", "Page 19", "page 19", "PAGE 19", "Page: 19", "p. 19", "pg 19", etc.
  const cleanText = text.trim();

  // Try to find any number in the text
  const numberMatch = cleanText.match(/\d+/);
  if (numberMatch) {
    const pageNumber = parseInt(numberMatch[0]);
    return isNaN(pageNumber) ? null : pageNumber;
  }

  return null;
};

// Check if href is a UUID (fileId)
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Check if a link is a file page link
const isFilePageLink = (node: ProsemirrorNode, linkMark: Mark): boolean => {
  if (!linkMark || !linkMark.attrs.href) return false;
  
  const href = linkMark.attrs.href;
  const text = node.textContent;
  
  // Check if href is a UUID and text contains a page number
  if (!isUUID(href)) return false;
  
  const pageNumber = extractPageNumber(text);
  return pageNumber !== null;
};

// Create a widget decoration for file page links
const createFilePageLinkWidget = (
  pos: number,
  node: ProsemirrorNode,
  linkMark: Mark,
  options: FilePageLinkPluginOptions
): Decoration => {
  const href = linkMark.attrs.href;
  const text = node.textContent;
  const pageNumber = extractPageNumber(text);

  const handleClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    if (!pageNumber) return;

    try {
      // Open right sidebar if closed and switch to files view
      if (!options.isRightOpen) {
        options.openRight();
      }
      options.setActiveView("files");

      // Select the file first
      if (options.currentFileId !== href) {
        await options.selectFile(href);
      }

      // Navigate to the specific page (with a small delay to ensure PDF loads)
      setTimeout(() => {
        options.setLeftSidebarOpen(false);
        if (options.scrollToPageRef) {
          options.scrollToPageRef(pageNumber);
        }
      }, 500);

      toast.success("Navigated to file", {
        description: `Opened file at page ${pageNumber}`,
      });
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Navigation failed", {
        description: `Could not open file`,
      });
    }
  };

  const button = document.createElement("button");
  button.className = "file-page-link-widget inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 cursor-pointer border border-blue-300 dark:border-blue-700 min-h-[28px]";
  button.setAttribute("contenteditable", "false");
  button.title = `Go to page ${text} in file ${href}`;
  button.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  button.onclick = (e) => {
    handleClick(e);
  };
  
  const span = document.createElement("span");
  span.className = "flex items-center justify-center";
  span.textContent = `📄 ${text}`;
  button.appendChild(span);

  return Decoration.widget(pos, button, {
    side: -1,
    stopEvent: (event) => {
      // Stop all events to prevent editor interactions
      return true;
    },
  });
};

export const filePageLinkPlugin = (options: FilePageLinkPluginOptions) => {
  const pluginKey = new PluginKey("filePageLink");
  
  return new Plugin({
    key: pluginKey,
    state: {
      init(config, state) {
        const decorations: Decoration[] = [];
        const doc = state.doc;

        doc.descendants((node, pos) => {
          // Only process text nodes with link marks
          if (!node.isText) return;

          const linkMark = node.marks.find((mark) => mark.type.name === "link");
          
          if (linkMark && isFilePageLink(node, linkMark)) {
            console.log('✨ File page link detected on init:', {
              text: node.textContent,
              href: linkMark.attrs.href
            });
            
            // Add widget decoration at the start of the text
            decorations.push(
              createFilePageLinkWidget(pos, node, linkMark, options)
            );
            
            // Hide the original text by adding an inline decoration
            decorations.push(
              Decoration.inline(pos, pos + node.nodeSize, {
                style: 'font-size: 0; line-height: 0; color: transparent; user-select: none;',
                class: 'file-page-link-hidden'
              })
            );
          }
        });

        return DecorationSet.create(doc, decorations);
      },
      apply(tr, oldSet, oldState, newState) {
        // If no document changes, just map the decorations
        if (!tr.docChanged) {
          return oldSet.map(tr.mapping, tr.doc);
        }
        
        // Rebuild decorations when document changes
        const decorations: Decoration[] = [];
        const doc = newState.doc;

        doc.descendants((node, pos) => {
          // Only process text nodes with link marks
          if (!node.isText) return;

          const linkMark = node.marks.find((mark) => mark.type.name === "link");
          
          if (linkMark && isFilePageLink(node, linkMark)) {
            // Add widget decoration at the start of the text
            decorations.push(
              createFilePageLinkWidget(pos, node, linkMark, options)
            );
            
            // Hide the original text by adding an inline decoration
            decorations.push(
              Decoration.inline(pos, pos + node.nodeSize, {
                style: 'font-size: 0; line-height: 0; color: transparent; user-select: none;',
                class: 'file-page-link-hidden'
              })
            );
          }
        });

        return DecorationSet.create(doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return pluginKey.getState(state);
      },
    },
  });
};

