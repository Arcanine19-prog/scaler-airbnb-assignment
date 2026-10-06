/* eslint-disable @next/next/no-img-element */
import type { User } from "@/lib/types";

export function Avatar({ user, size = 40, className = "" }: { user: Pick<User, "name" | "avatar_url">; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (user.avatar_url)
    return <img src={user.avatar_url} alt={user.name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span style={{ ...style, fontSize: size * 0.42 }} className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-bg ${className}`}>
      {user.name.charAt(0)}
    </span>
  );
}
