// __tests__/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../crawler-frontend/src/App';
import '@testing-library/jest-dom';


// Мокаем fetch для запросов к API (если используешь fetch)
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders URL input and Add button', () => {
  render(<App />);
  expect(screen.getByPlaceholderText(/enter website url/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add url/i })).toBeInTheDocument();
});

test('adds a new URL and displays it in the list', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 1, url: 'https://example.com', status: 'queued' }),
  });

  render(<App />);

  const input = screen.getByPlaceholderText(/enter website url/i);
  fireEvent.change(input, { target: { value: 'https://example.com' } });

  const addButton = screen.getByRole('button', { name: /add url/i });
  fireEvent.click(addButton);

  await waitFor(() => {
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
  });
});

test('starts crawling a URL and shows status running', async () => {
  // Мок ответа для запуска краулинга
  (fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) }) // добавление url
    .mockResolvedValueOnce({ ok: true }) // старт краулинга

  render(<App />);

  const input = screen.getByPlaceholderText(/enter website url/i);
  fireEvent.change(input, { target: { value: 'https://example.com' } });

  fireEvent.click(screen.getByRole('button', { name: /add url/i }));

  await waitFor(() => expect(screen.getByText('https://example.com')).toBeInTheDocument());

  const startButton = screen.getByRole('button', { name: /start/i });
  fireEvent.click(startButton);

  await waitFor(() => {
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });
});

test('shows details view with chart and broken links', async () => {
  // Мок ответа для загрузки детализации
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      htmlVersion: 'HTML5',
      title: 'Example Page',
      internalLinks: 5,
      externalLinks: 10,
      brokenLinks: [
        { url: 'https://broken-link.com', status: 404 },
      ],
      hasLoginForm: true,
    }),
  });

  render(<App />);

  // Навигация к деталям — имитируем клик по строке
  const urlRow = screen.getByText('https://example.com');
  fireEvent.click(urlRow);

  await waitFor(() => {
    expect(screen.getByText(/HTML5/i)).toBeInTheDocument();
    expect(screen.getByText(/Example Page/i)).toBeInTheDocument();
    expect(screen.getByText(/Broken Links/i)).toBeInTheDocument();
    expect(screen.getByText('https://broken-link.com')).toBeInTheDocument();
  });
});

test('bulk delete URLs', async () => {
  // Мок списка URL
  (fetch as jest.Mock)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, url: 'https://example1.com', status: 'done' },
        { id: 2, url: 'https://example2.com', status: 'done' },
      ],
    })
    .mockResolvedValueOnce({ ok: true }) // Удаление

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('https://example1.com')).toBeInTheDocument();
    expect(screen.getByText('https://example2.com')).toBeInTheDocument();
  });

  // Выбираем чекбоксы
  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[1]);
  fireEvent.click(checkboxes[2]);

  // Нажимаем кнопку Delete Selected
  const deleteButton = screen.getByRole('button', { name: /delete selected/i });
  fireEvent.click(deleteButton);

  await waitFor(() => {
    expect(screen.queryByText('https://example1.com')).not.toBeInTheDocument();
    expect(screen.queryByText('https://example2.com')).not.toBeInTheDocument();
  });
});
