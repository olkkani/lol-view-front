import { Menu } from '@base-ui/react/menu';
import { Link } from '@tanstack/react-router';
import { LogOut, Users } from 'lucide-react';
import { useMe } from '@/features/auth/api/useMe';
import { useLogout } from '@/features/auth/api/useLogout';

export function HamburgerMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: me } = useMe();
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => {
    logout(undefined, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Menu.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Menu.Trigger
        aria-label="메뉴"
        className="flex size-11 flex-col items-center justify-center gap-1"
      >
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4}>
          <Menu.Popup className="w-48 rounded-lg border border-[color:var(--hairline,#dddddd)] bg-white p-2 shadow-lg">
            <Menu.Item
              render={<Link to="/teams" />}
              className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-[color:var(--ink,#222222)] hover:bg-[color:var(--surface-soft,#f7f7f7)] data-[highlighted]:bg-[color:var(--surface-soft,#f7f7f7)]"
            >
              <Users className="size-5" aria-hidden="true" />
              팔로우 팀 추가
            </Menu.Item>
            {me && (
              <Menu.Item
                closeOnClick={false}
                onClick={handleLogout}
                disabled={isPending}
                className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-[color:var(--ink,#222222)] hover:bg-[color:var(--surface-soft,#f7f7f7)] data-[highlighted]:bg-[color:var(--surface-soft,#f7f7f7)] data-[disabled]:opacity-50"
              >
                <LogOut className="size-5" aria-hidden="true" />
                로그아웃
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
