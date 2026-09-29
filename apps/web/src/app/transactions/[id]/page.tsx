'use client';

import React, { use } from 'react';
import { useParams } from 'next/navigation';
import { TransactionRoom } from '../../../components/TransactionRoom';

export default function TransactionRoomDynamicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const hookParams = useParams();
  const id = resolvedParams?.id || (hookParams?.id as string);

  const initialStory = id === 'story-a' ? 'STORY_A' : 'STORY_B';

  return <TransactionRoom initialStory={initialStory} txId={id} />;
}
