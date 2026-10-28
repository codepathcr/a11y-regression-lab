import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { INITIAL_MEMBERS, TeamContext } from './team-context';
import type { Member, Role, TeamState } from './team-context';

export function TeamProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const setRole = useCallback((id: string, role: Role) => {
    setMembers((current) => {
      const target = current.find((member) => member.id === id);
      if (target) setAnnouncement(`${target.name} ahora es ${role}.`);
      return current.map((member) => (member.id === id ? { ...member, role } : member));
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMembers((current) => {
      const target = current.find((member) => member.id === id);
      if (target) setAnnouncement(`${target.name} fue retirada del equipo.`);
      return current.filter((member) => member.id !== id);
    });
  }, []);

  const value = useMemo<TeamState>(
    () => ({
      members,
      setRole,
      remove,
      inviteOpen,
      setInviteOpen,
      invite: (name: string, email: string) => {
        setMembers((current) => [
          ...current,
          { id: `m${current.length + 1}`, name, email, role: 'lectora', pending: true },
        ]);
        setInviteOpen(false);
        setAnnouncement(`Invitación enviada a ${email}.`);
      },
      announcement,
    }),
    [members, setRole, remove, inviteOpen, announcement]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}
