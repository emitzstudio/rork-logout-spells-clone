import { brochureText } from "@/data/spellBrochure";

/** An extractive pointer: headings are taken from the source, never invented by a model. */
export interface BrochurePointer {
  heading: string;
  text: string;
}

/** Splits prose into ordered sentence/list pointers without dropping qualifiers or changing facts. */
export function brochurePointers(paragraphs: readonly string[]): BrochurePointer[] {
  const pointers: BrochurePointer[] = [];
  for (const paragraph of paragraphs) {
    const protectedParts: string[] = [];
    const protectedText = brochureText(paragraph).replace(/https?:\/\/[^\s)]+|\b(?:Mr|Mrs|Ms|Dr|St|Mt|INR|Rs|No|e\.g|i\.e)\.|\b(?:[ap]\.m\.|[A-Z]\.)+/gi, (match) => {
      protectedParts.push(match);
      return `\uE000${protectedParts.length - 1}\uE001`;
    });
    const restore = (text: string): string => text.replace(/\uE000(\d+)\uE001/g, (_, index: string) => protectedParts[Number(index)]);
    for (const line of protectedText.split(/\n+/)) {
      const plain = line.replace(/^\s*(?:[•*\-]|\d+[.)])\s+/, "").trim();
      // Sentence punctuation only: never split decimals, times, prices, URLs or conditional clauses at commas.
      const sentences: string[] = [];
      for (const part of plain.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}“"‘])/u)) {
        if (sentences.length && /^(?:subject to|only |unless |if |depending |provided |not |these |this |it |availability|weather permitting|at an additional|extra charge|however)/i.test(part)) sentences[sentences.length - 1] += ` ${part}`;
        else if (sentences.length && /^(?:No |Just |Good |Slow |More |Less |Nothing |A little )/.test(sentences[sentences.length - 1]) && /^(?:No |Just |Good |Slow |More |Less |Nothing |A little )/.test(part) && sentences[sentences.length - 1].length < 65 && part.length < 55 && (sentences[sentences.length - 1] + part).length < 125) sentences[sentences.length - 1] += ` ${part}`;
        else sentences.push(part);
      }
      for (const part of sentences) {
        const sentence = restore(part).trim();
        if (!sentence) continue;
        const labelled = sentence.match(/^(.{2,65}?)(?:\s+[—–]\s+|:\s+)(.+)$/u);
        const qualified = /\b(?:if|unless|only|subject|not|optional|extra|excluded|excluding|depends|depending|but|provided|may|availability)\b/i.test(sentence);
        if (qualified) {
          // Never promote an unqualified fragment of a conditional statement to a headline.
          pointers.push({ heading: "", text: sentence });
        } else if (labelled && !/^https?:/i.test(sentence)) {
          pointers.push({ heading: labelled[1], text: labelled[2] });
        } else if (sentence.length <= 76 && !/https?:\/\//i.test(sentence)) {
          pointers.push({ heading: sentence, text: "" });
        } else {
          // A short source excerpt gives the Grimoire its uppercase activity label.
          // Keep the complete sentence below it so negations and conditions remain attached.
          const clause = sentence.match(/^(.{8,60}?)[,;:](?:\s|$)/)?.[1];
          const excerpt = clause ?? sentence.split(/\s+/).slice(0, 6).join(" ").replace(/\s+(?:a|an|the|and|or|to|of|with|at|in|for|as|on|by|your|our)$/i, "");
          pointers.push({ heading: /https?:\/\//i.test(excerpt) ? "" : excerpt, text: sentence });
        }
      }
    }
  }
  return pointers;
}
