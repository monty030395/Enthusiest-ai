import ShareTargetHandoff from "../_components/ShareTargetHandoff";

// Where Android's share sheet lands when someone shares a listing to the
// installed app (see share_target in manifest.json). Nothing renders for
// long — the handoff stashes what was shared and bounces to the analyser.
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <ShareTargetHandoff
      title={first(params.title)}
      text={first(params.text)}
      url={first(params.url)}
    />
  );
}
