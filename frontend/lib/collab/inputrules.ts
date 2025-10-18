import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { Plugin } from "prosemirror-state";
import { schema } from "./schema";

/**
 * Build input rules for markdown shortcuts
 */
export function buildInputRules(): Plugin {
  const rules: InputRule[] = [];

  // Markdown link rule: [text](url) for links
  rules.push(
    new InputRule(
      /\[([^\]]+)\]\(([^)]+)\)$/,
      (state, match, start, end) => {
        const [, text, url] = match;
        console.log('🔗 Link input rule triggered!', { text, url, start, end });
        const tr = state.tr;
        
        // Delete the markdown syntax
        tr.delete(start, end);
        
        // Insert the link text with link mark
        const linkMark = schema.marks.link.create({ href: url });
        tr.insert(start, schema.text(text, [linkMark]));
        
        console.log('✅ Link created successfully');
        return tr;
      }
    )
  );

  // Heading rules: # for h1, ## for h2, etc.
  for (let level = 1; level <= 6; level++) {
    rules.push(
      textblockTypeInputRule(
        new RegExp(`^(#{${level}})\\s$`),
        schema.nodes.heading,
        { level }
      )
    );
  }

  // Blockquote rule: > for blockquote
  if (schema.nodes.blockquote) {
    rules.push(
      wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote)
    );
  }

  // Code block rule: ``` for code block
  if (schema.nodes.code_block) {
    rules.push(
      textblockTypeInputRule(/^```$/, schema.nodes.code_block)
    );
  }

  // Bullet list rule: - or * for bullet list
  if (schema.nodes.bullet_list) {
    rules.push(
      wrappingInputRule(
        /^\s*([-+*])\s$/,
        schema.nodes.bullet_list,
        undefined,
        () => ({ tight: true })
      )
    );
  }

  // Ordered list rule: 1. for ordered list
  if (schema.nodes.ordered_list) {
    rules.push(
      wrappingInputRule(
        /^(\d+)\.\s$/,
        schema.nodes.ordered_list,
        (match) => ({ order: +match[1] }),
        (match, node) => node.childCount + node.attrs.order === +match[1]
      )
    );
  }

  return inputRules({ rules });
}

