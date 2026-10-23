import './globals.css';

export const metadata = {
  title: 'Ticket V1 · LINE Support',
  description: 'ระบบจัดการคำร้องจาก LINE Official Account',
};

export default function Layout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
