import { redirect } from "next/navigation";

// "Needs you" is the home screen (the decision feed). Send / there.
export default function Home() {
  redirect("/needs-you");
}
