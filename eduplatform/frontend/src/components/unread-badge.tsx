export function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span role="status" aria-label={`${count} ta o‘qilmagan xabar`} className={`grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}>{count > 9 ? '9+' : count}</span>;
}
