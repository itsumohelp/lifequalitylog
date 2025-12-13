export type CircleBalanceSnapshot = ({
  user: {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
  };
} & {
  id: string;
  circleId: string;
  userId: string;
  amount: number;
  note: string | null;
  snapshotDate: Date;
  createdAt: Date;
  signature: string;
  signatureAlgo: string;
  signatureAt: Date;
  isSignatureVerified: boolean;
  diffFromPrev: number | null;
})[];
