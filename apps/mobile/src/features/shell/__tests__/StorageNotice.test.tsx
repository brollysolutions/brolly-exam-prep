import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { kvStorage, type StorageStatus } from '@/data/storage';
import { StorageNotice } from '../StorageNotice';

afterEach(() => {
  jest.restoreAllMocks();
  initI18n('en');
});

it.each([
  ['en', 'Retry saving', 'Saving on this device is unavailable.'],
  ['te', 'సేవ్ చేయడానికి మళ్లీ ప్రయత్నించండి', 'ఈ పరికరంలో సేవ్ చేయడం సాధ్యం కావడం లేదు.'],
] as const)('shows a recoverable storage warning in %s', async (lang, retryLabel, message) => {
  initI18n(lang);
  let status: StorageStatus = 'temporary';
  let notify = () => undefined as void;
  jest.spyOn(kvStorage, 'getStatus').mockImplementation(() => status);
  jest.spyOn(kvStorage, 'subscribe').mockImplementation((listener) => {
    notify = listener;
    return () => undefined;
  });
  jest.spyOn(kvStorage, 'retry').mockImplementation(() => {
    status = 'persistent';
    notify();
    return true;
  });
  await render(<StorageNotice />);
  expect(screen.getByRole('alert')).toHaveTextContent(new RegExp(message));
  await userEvent.press(screen.getByRole('button', { name: retryLabel }));
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
});
