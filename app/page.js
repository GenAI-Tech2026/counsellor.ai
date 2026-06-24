import { redirect } from 'next/navigation';

// No landing page — send people straight into the counsellor chat.
export default function Home() {
  redirect('/chat');
}
