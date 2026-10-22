import QuorumApp from "../../quorum-app";
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return <QuorumApp invite={(await params).token} />;
}
