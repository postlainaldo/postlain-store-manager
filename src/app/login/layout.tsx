// Login route gets no additional layout wrapper —
// AppShell in root layout handles the shell-less path detection.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
