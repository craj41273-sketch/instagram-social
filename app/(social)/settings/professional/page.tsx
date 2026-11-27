import { requireProfile } from "@/lib/auth/dal";
import { ProfessionalProfileForm } from "@/components/settings/professional-profile-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getProfessionalProfile } from "@/lib/professional/service";

export default async function ProfessionalSettingsPage() {
  const current = await requireProfile();
  const professional = await getProfessionalProfile(current.user.id, current.user.id);

  return (
    <SettingsPage
      title="Professional profile"
      description="Describe your work. All fields are self-described, not verified."
      currentPath="/settings/professional"
    >
      <ProfessionalProfileForm
        initial={{
          category: professional?.category ?? "personal",
          roles: professional?.roles ?? [],
          details: professional?.details ?? {},
        }}
      />
    </SettingsPage>
  );
}
