export interface ReviewSelectionItem {
  documentId: string;
}

export function getSelectedPageItems<T extends ReviewSelectionItem>(items: T[], selectedIds: string[]) {
  const selectedSet = new Set(selectedIds);
  return items.filter((item) => selectedSet.has(item.documentId));
}
