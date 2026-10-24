import ProfileWizard from "@/components/ProfileWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <ProfileWizard mode="create" />
    </main>
  );
}
