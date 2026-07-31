import { FormEvent, useMemo, useState } from "react";
import { Mic, Search, Volume2 } from "lucide-react";
import type { ComparisonResponse } from "../types/commerce";

type Props = {
  query: string;
  loading: boolean;
  response: ComparisonResponse | null;
  error: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
};

const suggestionCatalog = [
  "air conditioner 1.5 ton 5 star",
  "air fryer",
  "almond oil",
  "apple iphone 16",
  "apple watch",
  "atta 10 kg",
  "baby diapers",
  "backpack for men",
  "badminton racket",
  "bedsheet king size",
  "bluetooth speaker",
  "book shelf",
  "camera bag",
  "ceiling fan",
  "coffee powder",
  "copper water bottle",
  "curtains for window",
  "dell laptop",
  "dinner set",
  "double door fridge",
  "dress for women",
  "earbuds under Rs. 2000",
  "electric kettle",
  "extension board",
  "face wash",
  "formal shoes",
  "fridge double door 5 star",
  "fridge double door 5 star",
  "fridge single door 5 star",
  "fridge under Rs. 30000",
  "fridge storage containers",
  "fridge magnet",
  "fridge cover top",
  "fridge mats",
  "fridge organiser storage boxes",
  "gaming laptop under Rs. 80000",
  "gas stove 3 burner",
  "ghee 1 litre",
  "gift for men",
  "hair dryer",
  "headphones under Rs. 3000",
  "helmet for bike",
  "hp laptop",
  "induction stove",
  "iphone 15 cover",
  "iphone 16 pro max",
  "iron box",
  "jacket for men",
  "jeans for women",
  "jbl speaker",
  "jewellery box",
  "kitchen rack",
  "kurti for women",
  "keyboard wireless",
  "kids shoes",
  "laptop under Rs. 60000",
  "led tv 55 inch",
  "lenovo laptop",
  "lunch box steel",
  "mobile charger",
  "mixer grinder",
  "monitor 24 inch",
  "mosquito racket",
  "nike running shoes",
  "notebook pack",
  "noise smartwatch",
  "non stick pan",
  "office chair",
  "oneplus phone",
  "organic honey",
  "oven microwave",
  "power bank 20000mah",
  "pressure cooker",
  "printer for home",
  "puma shoes",
  "queen size bed",
  "quilt blanket",
  "quinoa seeds",
  "redmi phone",
  "refrigerator double door",
  "rice 10 kg",
  "running shoes for men",
  "samsung fridge",
  "samsung s26 ultra",
  "shoes under Rs. 2000",
  "shirt for men",
  "smart watch",
  "sofa cover",
  "tea powder",
  "trimmer for men",
  "trolley bag",
  "tv 55 inch smart",
  "umbrella for rain",
  "usb c cable",
  "utensil stand",
  "vacuum cleaner",
  "vivo phone",
  "voltas ac",
  "wallet for men",
  "washing machine 7 kg",
  "water bottle 1 litre",
  "water bottle steel",
  "water purifier under Rs. 10000",
  "western dress",
  "xiaomi phone",
  "xbox controller",
  "xl bedsheet",
  "yoga mat",
  "yogurt maker",
  "zebronics keyboard",
  "zipper hoodie",
  "running shoes for men",
  "running shoes for women",
  "nike shoes under Rs. 2000",
  "puma shoes under Rs. 1500",
  "laptop under Rs. 60000",
  "gaming laptop under Rs. 80000",
  "student laptop under Rs. 40000",
  "55 inch smart TV under Rs. 50000",
  "washing machine 7 kg",
  "air conditioner 1.5 ton 5 star",
  "wireless earbuds under Rs. 2000",
  "headphones under Rs. 3000",
  "water bottle 1 litre",
  "water bottle steel",
  "water bottle copper",
  "water bottle for kids",
  "water bottle under Rs. 500",
  "waterproof backpack",
  "water purifier under Rs. 10000",
  "atomic habits book",
  "rice 10 kg",
  "coffee powder"
].filter((item, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function generatedSuggestions(value: string) {
  const normalized = normalizeQuery(value);
  if (normalized.length < 1) return [];
  const readable = normalized
    .split(" ")
    .map((word) => (word.length <= 2 ? word : word))
    .join(" ");
  return [
    readable,
    `${readable} under Rs. 500`,
    `${readable} under Rs. 1000`,
    `${readable} best brands`,
    `${readable} offers`
  ];
}

export function ChatPanel({ query, loading, response, error, onQueryChange, onSearch }: Props) {
  const examples = ["shoes under Rs. 2000", "laptop under Rs. 60000", "55 inch smart TV under Rs. 50000"];
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const filteredSuggestions = useMemo(() => {
    const normalized = normalizeQuery(query);
    if (normalized.length < 1) return [];
    const words = normalized.split(" ");
    const matches = suggestionCatalog.filter((item) => {
      const itemText = item.toLowerCase();
      return itemText.includes(normalized) || words.every((word) => itemText.includes(word));
    }).sort((a, b) => {
      const aText = a.toLowerCase();
      const bText = b.toLowerCase();
      const aStarts = aText.startsWith(normalized) ? 0 : 1;
      const bStarts = bText.startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aText.localeCompare(bText);
    });
    return [...matches, ...generatedSuggestions(query)]
      .filter((item, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 10);
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSuggestionsOpen(false);
    onSearch();
  }

  function chooseSuggestion(value: string) {
    onQueryChange(value);
    setSuggestionsOpen(false);
  }

  return (
    <section className="chat-panel">
      {(loading || error) && (
        <div className="search-status">
          {loading ? <span className="typing">Scanning trusted stores</span> : error}
        </div>
      )}
      <form className="prompt-bar" onSubmit={submit}>
        <button type="button" className="icon-button" title="Voice input"><Mic size={18} /></button>
        <div className="search-box">
          <input
            value={query}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            placeholder="Search products, e.g. shoes under Rs. 2000..."
          />
          {suggestionsOpen && filteredSuggestions.length > 0 && (
            <div className="autocomplete-panel">
              {filteredSuggestions.map((suggestion) => (
                <button type="button" key={suggestion} onMouseDown={() => chooseSuggestion(suggestion)}>
                  <Search size={16} />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="icon-button" title="Read answer"><Volume2 size={18} /></button>
        <button className="search-button" disabled={loading || !query.trim()}><Search size={18} /> Compare</button>
      </form>
      <div className="suggestions" aria-label="Search examples">
        {examples.map((example) => (
          <button type="button" key={example} onClick={() => onQueryChange(example)}>
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
