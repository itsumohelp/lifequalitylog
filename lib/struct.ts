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
  createdAt: Date;
  updatedAt: Date;
  circleId: string;
  userId: string;
  amount: number;
  memo: string | null;
  recordedAt: Date;
})[];
