import assert from 'node:assert/strict';
import { HttpApi } from '../data/api/http';

// This creates practice attempts. Use a local/staging origin, or explicitly choose production.
const baseUrl = process.argv[2] ?? process.env.API_BASE_URL ?? 'http://127.0.0.1:3202/api';
const api = new HttpApi({ baseUrl });
async function main() {
  assert.equal((await api.health()).status, 'ok');
  const [catalog, content] = await Promise.all([api.listTestMetas(), api.getContent()]);
  assert.ok(content.studySections.length);
  let count = 0;
  for (const meta of catalog) {
    const [paper, info] = await Promise.all([api.getPaper(meta.id), api.getTestMeta(meta.id)]);
    assert.deepEqual(info, meta);
    assert.equal(paper.length, meta.pattern.totalQuestions);
    count += paper.length;
    if (meta.kind === 'full')
      assert.ok(paper.every((q) => q.correct === undefined && q.explanation === undefined));
    if (!meta.free || meta.demo) continue;
    const attempt = await api.createAttempt({ test_id: meta.id });
    assert.deepEqual(await api.getAttemptMeta(attempt.id), meta);
    assert.deepEqual(await api.getAttemptPaper(attempt.id), paper);
    await api.patchAttemptAnswer(attempt.id, { question_id: paper[0].id, choice: 0, marked: true });
    await assert.rejects(api.getReviewPaper(attempt.id), { status: 409 });
    const submitted = await api.submitAttempt(attempt.id, {
      answers: [{ question_id: paper[0].id, choice: 0, seconds: 9 }],
      elapsed_seconds: 12,
    });
    const [result, review] = await Promise.all([
      api.getResultDetail(submitted.result_id),
      api.getReviewPaper(submitted.result_id),
    ]);
    assert.equal(result.correct, review[0].correct === 0 ? 1 : 0);
    assert.equal(result.skipped, paper.length - 1);
    assert.equal(result.review[0].seconds, 9);
    assert.equal(review.length, paper.length);
    assert.deepEqual(await api.submitAttempt(attempt.id, { answers: [] }), submitted);
    console.log(`${meta.id}: ${paper.length} questions, submit + saved result + solutions OK`);
  }
  console.log(
    `${baseUrl}: ${catalog.length} tests / ${count} questions; content and attempt flows OK`,
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
