import { standardsFor } from '@tslprb/fixtures';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useEligibilityStore } from '@/data/eligibility';
import { useSessionStore } from '@/data/session';
import { EligibilityView } from '@/features/eligibility/EligibilityView';
import { evaluate, toInput } from '@/features/eligibility/evaluate';

/**
 * F-25 — the PMT/PET eligibility checker.
 *
 * No gate: the standards are published and the answer is a measurement, not a score, so there
 * is nothing here for an account to hold. The post and category group start from the profile
 * when there is one — a candidate who told us they are an ST constable aspirant should not have
 * to say it twice — but either can be overridden here without writing back to the session,
 * because checking a friend's numbers must not change your own exam settings.
 */
export default function EligibilityRoute() {
  const router = useRouter();
  const sessionPost = useSessionStore((s) => s.post);
  const sessionCategory = useSessionStore((s) => s.category);

  const storedPost = useEligibilityStore((s) => s.post);
  const storedGender = useEligibilityStore((s) => s.gender);
  const storedGroup = useEligibilityStore((s) => s.group);
  const values = useEligibilityStore((s) => s.values);
  const checked = useEligibilityStore((s) => s.checked);
  const setPost = useEligibilityStore((s) => s.setPost);
  const setGender = useEligibilityStore((s) => s.setGender);
  const setGroup = useEligibilityStore((s) => s.setGroup);
  const setValue = useEligibilityStore((s) => s.setValue);
  const check = useEligibilityStore((s) => s.check);

  const post = storedPost ?? sessionPost ?? 'pc';
  const gender = storedGender ?? 'male';
  const group = storedGroup ?? (sessionCategory === 'st' ? 'st' : 'general');

  const result = useMemo(
    () =>
      checked
        ? evaluate(toInput(post, gender, group, values), standardsFor(post, gender, group))
        : undefined,
    [checked, post, gender, group, values],
  );

  return (
    <EligibilityView
      post={post}
      gender={gender}
      group={group}
      values={values}
      result={result}
      onPost={setPost}
      onGender={setGender}
      onGroup={setGroup}
      onChange={setValue}
      onCheck={check}
      onBack={() => router.back()}
    />
  );
}
