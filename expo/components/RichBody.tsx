import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

/**
 * Renders the Spell Builder's lightweight markup as real typography —
 * a native port of the web RichBody renderer (headings, lists, bold,
 * italic and links share the exact same syntax).
 */

type RichBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "para"; text: string };

const parseBlocks = (body: string): RichBlock[] => {
  const blocks: RichBlock[] = [];
  let para: string[] = [];
  const flush = (): void => {
    if (para.length > 0) {
      blocks.push({ kind: "para", text: para.join(" ") });
      para = [];
    }
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const heading = line.match(/^#{2,3}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "list" && !prev.ordered) prev.items.push(bullet[1]);
      else blocks.push({ kind: "list", ordered: false, items: [bullet[1]] });
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "list" && prev.ordered) prev.items.push(numbered[1]);
      else blocks.push({ kind: "list", ordered: true, items: [numbered[1]] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
};

const EMPHASIS_SPLIT = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const renderEmphasis = (text: string, keyBase: string): React.ReactNode[] =>
  text
    .split(EMPHASIS_SPLIT)
    .filter((part) => part !== "")
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <Text key={`${keyBase}-b${i}`} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <Text key={`${keyBase}-i${i}`} style={styles.italic}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={`${keyBase}-s${i}`}>{part}</Text>;
    });

const renderInline = (text: string, keyBase: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  Array.from(text.matchAll(LINK_RE)).forEach((match, i) => {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(...renderEmphasis(text.slice(cursor, index), `${keyBase}-t${i}`));
    nodes.push(
      <Text key={`${keyBase}-l${i}`} style={styles.link}>
        {renderEmphasis(match[1], `${keyBase}-lt${i}`)}
      </Text>,
    );
    cursor = index + match[0].length;
  });
  if (cursor < text.length) nodes.push(...renderEmphasis(text.slice(cursor), `${keyBase}-tail`));
  return nodes;
};

interface RichBodyProps {
  body: string;
  /** Scale factor matching the page zoom — sizes are authored at preview scale. */
  z?: number;
  style?: StyleProp<ViewStyle>;
  pStyle?: StyleProp<TextStyle>;
}

export default function RichBody({ body, z = 1.35, style, pStyle }: RichBodyProps) {
  const blocks = parseBlocks(body);
  if (blocks.length === 0) return null;

  const paragraphStyle: TextStyle = {
    fontFamily: Fonts.sans,
    fontSize: 10.5 * z,
    lineHeight: 16.5 * z,
    color: "rgba(245,240,232,0.6)",
  };

  return (
    <View style={[{ gap: 8 * z }, style]}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <Text
              key={i}
              style={{
                paddingTop: 2 * z,
                fontFamily: Fonts.serif,
                fontSize: 12.5 * z,
                lineHeight: 16 * z,
                color: Colors.cream,
              }}
            >
              {renderInline(block.text, `h${i}`)}
            </Text>
          );
        }
        if (block.kind === "list") {
          return (
            <View key={i} style={{ gap: 4 * z }}>
              {block.items.map((item, j) => (
                <View key={j} style={styles.listRow}>
                  {block.ordered ? (
                    <Text
                      style={{
                        fontFamily: Fonts.serifItalic,
                        fontSize: 9.5 * z,
                        lineHeight: 16.5 * z,
                        color: "rgba(184,150,62,0.7)",
                      }}
                    >
                      {j + 1}.
                    </Text>
                  ) : (
                    <Text
                      style={{
                        fontSize: 8 * z,
                        lineHeight: 16.5 * z,
                        color: "rgba(184,150,62,0.6)",
                      }}
                    >
                      ✦
                    </Text>
                  )}
                  <Text style={[paragraphStyle, styles.listText, pStyle]}>
                    {renderInline(item, `${block.ordered ? "o" : "u"}${i}-${j}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={[paragraphStyle, pStyle]}>
            {renderInline(block.text, `p${i}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontFamily: Fonts.sansMedium,
    color: Colors.cream,
  },
  italic: {
    fontStyle: "italic",
  },
  link: {
    color: Colors.goldLight,
    textDecorationLine: "underline",
  },
  listRow: {
    flexDirection: "row",
    gap: 6,
  },
  listText: {
    flex: 1,
  },
});
