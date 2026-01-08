import { useEffect, useState } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

const TableOfContents = ({ content }: TableOfContentsProps) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  useEffect(() => {
    if (!content) return;

    // Parse HTML content to extract headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h2, h3, h4");
    
    const items: TocItem[] = [];
    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim();
      if (text) {
        const id = `heading-${index}`;
        items.push({
          id,
          text,
          level: parseInt(heading.tagName.charAt(1)),
        });
      }
    });

    setTocItems(items);
  }, [content]);

  if (tocItems.length === 0) return null;

  const scrollToHeading = (id: string, index: number) => {
    // Find the content container and scroll to the heading
    const contentContainer = document.querySelector('.movie-content-html');
    if (contentContainer) {
      const headings = contentContainer.querySelectorAll('h2, h3, h4');
      const targetHeading = headings[index];
      if (targetHeading) {
        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="rounded-lg bg-card p-4 mb-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
        <List className="h-4 w-4" />
        Mục lục
      </h3>
      <nav aria-label="Mục lục nội dung">
        <ul className="space-y-1.5">
          {tocItems.map((item, index) => (
            <li
              key={item.id}
              style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
            >
              <button
                onClick={() => scrollToHeading(item.id, index)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left w-full py-0.5"
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default TableOfContents;
