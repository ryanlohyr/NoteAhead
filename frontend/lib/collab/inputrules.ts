import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { NodeType } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { schema } from "./schema";

/**
 * Build input rules for markdown shortcuts
 */
export function buildInputRules(): Plugin {
  const rules: InputRule[] = [];

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
        (match) => ({ tight: true })
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

