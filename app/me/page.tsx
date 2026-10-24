import { Nav } from "@/components/Nav";
import { ProfileForm } from "@/components/ProfileForm";
import { SignOut } from "@/components/SignOut";
import { dict } from "@/lib/i18n";
import { requireProfile } from "@/lib/session";

export default async function Me() {
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);
  const { data: labels } = await supabase.from("labels").select("country, age, job").eq("user_id", profile.id).maybeSingle();
  return (
    <>
      <Nav t={t} active="me" alias={profile.alias} />
      <main>
        <ProfileForm
          userId={profile.id}
          initial={{ alias: profile.alias, lang: profile.lang }}
          labels={{ country: labels?.country ?? "", age: labels?.age ?? "", job: labels?.job ?? "" }}
        />
        <SignOut label={t.signOut} />
      </main>
    </>
  );
}
