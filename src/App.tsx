import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type PublishStatus = '候補' | '執筆中' | '予約投稿' | '投稿完了'
type ContentKind = 'note' | 'x' | 'threads'
type ViewKey = 'home' | ContentKind | 'memo' | 'logs'

type PublishItem = {
  id: string
  status: PublishStatus
  publishDate: string
  publicUrl: string
  title?: string
  body?: string
  memo?: string
}

type MemoItem = {
  id: string
  memo: string
  note: string
}

type AppData = {
  note: PublishItem[]
  x: PublishItem[]
  threads: PublishItem[]
  memo: MemoItem[]
}

const storageKey = 'ai-labo-content-v2'
const legacyStorageKey = 'ai-labo-content-v1'
const statuses: PublishStatus[] = ['候補', '執筆中', '予約投稿', '投稿完了']

const pageInfo: Record<ContentKind, { label: string; short: string; empty: string }> = {
  note: {
    label: 'noteページ',
    short: 'note',
    empty: 'noteに育てたいテーマを追加できます。',
  },
  x: {
    label: 'X投稿ページ',
    short: 'X',
    empty: 'X向けの本文とメモを追加できます。',
  },
  threads: {
    label: 'Threads投稿ページ',
    short: 'Threads',
    empty: 'Threads向けの本文とメモを追加できます。',
  },
}

const initialData: AppData = {
  note: [
    {
      id: 'note-ai-thinking',
      title: 'AIで日常の思考整理をラクにするnote',
      status: '候補',
      publishDate: '',
      publicUrl: '',
    },
  ],
  x: [
    {
      id: 'x-small-ai-habit',
      body: 'AI活用は「大きく変える」より、毎日の小さな記録から始める。',
      memo: '短く、続けやすさが伝わる投稿にする。',
      status: '候補',
      publishDate: '',
      publicUrl: '',
    },
  ],
  threads: [
    {
      id: 'threads-wall-chat',
      body: '記事構成をAIと壁打ちすると、読者像ごとの差分が見えやすくなる。',
      memo: 'note本文へつなげる前の気づきとして使う。',
      status: '候補',
      publishDate: '',
      publicUrl: '',
    },
  ],
  memo: [
    {
      id: 'memo-ai-habit-tracker',
      memo: 'AI習慣トラッカー',
      note: '毎日のAI活用を記録し、週ごとに改善アイデアを出す小さなアプリ。',
    },
    {
      id: 'memo-article-outline',
      memo: '記事構成の壁打ち実験',
      note: '同じテーマで3種類の構成案を出して、読者像ごとの差分を比較した。',
    },
    {
      id: 'memo-source-url',
      memo: '旧AI構想Laboから移行',
      note: 'https://mcwgw408-oss.github.io/AI-Labo-/ の初期データを、このAI-Laboに合わせて整理。',
    },
  ],
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const getItemText = (kind: ContentKind, item: PublishItem) =>
  kind === 'note' ? item.title || '無題のnote' : item.body || '本文未入力'

function normalizeData(savedData: Partial<AppData>): AppData {
  return {
    note: (savedData.note || initialData.note).map((item) => ({
      ...item,
      title: item.title || item.body || '',
    })),
    x: (savedData.x || initialData.x).map((item) => ({
      ...item,
      body: item.body || item.title || '',
      title: undefined,
      memo: item.memo || '',
    })),
    threads: (savedData.threads || initialData.threads).map((item) => ({
      ...item,
      body: item.body || item.title || '',
      title: undefined,
      memo: item.memo || '',
    })),
    memo: savedData.memo || initialData.memo,
  }
}

function loadData(): AppData {
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey)
    if (!saved) return initialData
    return normalizeData(JSON.parse(saved))
  } catch {
    return initialData
  }
}

function App() {
  const [view, setView] = useState<ViewKey>('home')
  const [data, setData] = useState<AppData>(loadData)
  const [drafts, setDrafts] = useState<Record<ContentKind, Omit<PublishItem, 'id'>>>({
    note: { title: '', status: '候補', publishDate: '', publicUrl: '' },
    x: { body: '', memo: '', status: '候補', publishDate: '', publicUrl: '' },
    threads: { body: '', memo: '', status: '候補', publishDate: '', publicUrl: '' },
  })
  const [memoDraft, setMemoDraft] = useState({ memo: '', note: '' })

  const logItems = useMemo(
    () =>
      (['note', 'x', 'threads'] as ContentKind[]).flatMap((kind) =>
        data[kind].map((item) => ({ ...item, kind })),
      ),
    [data],
  )

  const totals = useMemo(() => {
    const content = [...data.note, ...data.x, ...data.threads]
    return {
      all: content.length + data.memo.length,
      content: content.length,
      memo: data.memo.length,
      byStatus: statuses.map((status) => ({
        status,
        count: content.filter((item) => item.status === status).length,
      })),
      nextItems: content
        .filter((item) => item.publishDate)
        .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
        .slice(0, 4),
    }
  }, [data])

  const saveData = (nextData: AppData) => {
    setData(nextData)
    localStorage.setItem(storageKey, JSON.stringify(nextData))
  }

  const addPublishItem = (event: FormEvent, kind: ContentKind) => {
    event.preventDefault()
    const draft = drafts[kind]
    const mainText = kind === 'note' ? draft.title : draft.body
    if (!mainText?.trim()) return
    const item = {
      ...draft,
      id: createId(),
      title: draft.title?.trim(),
      body: draft.body?.trim(),
      memo: draft.memo?.trim(),
    }
    saveData({ ...data, [kind]: [item, ...data[kind]] })
    setDrafts({
      ...drafts,
      [kind]:
        kind === 'note'
          ? { title: '', status: '候補', publishDate: '', publicUrl: '' }
          : { body: '', memo: '', status: '候補', publishDate: '', publicUrl: '' },
    })
  }

  const updatePublishItem = (kind: ContentKind, id: string, patch: Partial<PublishItem>) => {
    saveData({
      ...data,
      [kind]: data[kind].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const deletePublishItem = (kind: ContentKind, id: string) => {
    saveData({ ...data, [kind]: data[kind].filter((item) => item.id !== id) })
  }

  const addMemo = (event: FormEvent) => {
    event.preventDefault()
    if (!memoDraft.memo.trim()) return
    saveData({
      ...data,
      memo: [{ id: createId(), memo: memoDraft.memo.trim(), note: memoDraft.note.trim() }, ...data.memo],
    })
    setMemoDraft({ memo: '', note: '' })
  }

  const updateMemo = (id: string, patch: Partial<MemoItem>) => {
    saveData({
      ...data,
      memo: data.memo.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const deleteMemo = (id: string) => {
    saveData({ ...data, memo: data.memo.filter((item) => item.id !== id) })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="AI-Labo navigation">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <div>
            <p>AI-Labo</p>
            <small>発信管理ノート</small>
          </div>
        </div>
        <nav className="nav-list">
          {[
            ['home', 'トップページ'],
            ['logs', 'ログ一覧ページ'],
            ['note', 'noteページ'],
            ['x', 'X投稿ページ'],
            ['threads', 'Threads投稿ページ'],
            ['memo', '仮メモページ'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={view === key ? 'nav-button is-active' : 'nav-button'}
              onClick={() => setView(key as ViewKey)}
              type="button"
            >
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI publishing workspace</p>
            <h1>
              {view === 'home'
                ? 'トップページ'
                : view === 'memo'
                  ? '仮メモページ'
                  : view === 'logs'
                    ? 'ログ一覧ページ'
                    : pageInfo[view].label}
            </h1>
          </div>
          <div className="save-pill">localStorage保存</div>
        </header>

        {view === 'home' && <HomePanel data={data} totals={totals} setView={setView} />}

        {view === 'logs' && <LogsPanel items={logItems} />}

        {(view === 'note' || view === 'x' || view === 'threads') && (
          <PublishPanel
            kind={view}
            items={data[view]}
            draft={drafts[view]}
            setDraft={(draft) => setDrafts({ ...drafts, [view]: draft })}
            onSubmit={(event) => addPublishItem(event, view)}
            onUpdate={(id, patch) => updatePublishItem(view, id, patch)}
            onDelete={(id) => deletePublishItem(view, id)}
          />
        )}

        {view === 'memo' && (
          <MemoPanel
            items={data.memo}
            draft={memoDraft}
            setDraft={setMemoDraft}
            onSubmit={addMemo}
            onUpdate={updateMemo}
            onDelete={deleteMemo}
          />
        )}
      </section>
    </main>
  )
}

function HomePanel({
  data,
  totals,
  setView,
}: {
  data: AppData
  totals: {
    all: number
    content: number
    memo: number
    byStatus: { status: PublishStatus; count: number }[]
    nextItems: PublishItem[]
  }
  setView: (view: ViewKey) => void
}) {
  return (
    <div className="home-layout">
      <section className="summary-grid">
        <SummaryCard label="すべて" value={totals.all} detail="記事案・投稿案・仮メモ" />
        <SummaryCard label="投稿管理" value={totals.content} detail="note / X / Threads" />
        <SummaryCard label="仮メモ" value={totals.memo} detail="断片メモと補足" />
      </section>

      <section className="status-board">
        <div className="section-heading">
          <h2>ステータスまとめ</h2>
          <p>全投稿ページの進み具合</p>
        </div>
        <div className="status-grid">
          {totals.byStatus.map((item) => (
            <div className="status-count" key={item.status}>
              <span className={`dot dot-${item.status}`} />
              <p>{item.status}</p>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section-heading page-jump-heading">
        <h2>ページ別まとめ</h2>
        <p>クリックすると各ページを開きます</p>
      </section>
      <div className="page-jump-grid">
        <button className="page-card" type="button" onClick={() => setView('logs')}>
          <span>ログ一覧ページ</span>
          <strong>{totals.content}</strong>
          <small>note / X / Threads</small>
        </button>
        {(['note', 'x', 'threads'] as ContentKind[]).map((kind) => (
          <button className="page-card" type="button" onClick={() => setView(kind)} key={kind}>
            <span>{pageInfo[kind].label}</span>
            <strong>{data[kind].length}</strong>
            <small>{pageInfo[kind].short}の投稿案</small>
          </button>
        ))}
        <button className="page-card" type="button" onClick={() => setView('memo')}>
          <span>仮メモページ</span>
          <strong>{data.memo.length}</strong>
          <small>メモと補足</small>
        </button>
      </div>

      <section className="upcoming-panel">
        <div className="section-heading">
          <h2>公開日が入っているもの</h2>
          <p>近い順に表示</p>
        </div>
        {totals.nextItems.length > 0 ? (
          <div className="mini-list">
            {totals.nextItems.map((item) => (
              <article key={item.id} className="mini-item">
                <time>{item.publishDate}</time>
                <p>{item.title || item.body}</p>
                <span>{item.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy">公開日が入っている記事はまだありません。</p>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="summary-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

function LogsPanel({ items }: { items: Array<PublishItem & { kind: ContentKind }> }) {
  const sortedItems = [...items].sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''))

  return (
    <section className="table-panel">
      <div className="section-heading">
        <h2>note、X投稿、Threads投稿</h2>
        <p>{items.length}件をまとめて表示</p>
      </div>
      <div className="log-list">
        {sortedItems.map((item) => (
          <article className="log-card" key={`${item.kind}-${item.id}`}>
            <div>
              <span className="kind-pill">{pageInfo[item.kind].short}</span>
              <h3>{getItemText(item.kind, item)}</h3>
              {item.kind !== 'note' && item.memo && <p>{item.memo}</p>}
            </div>
            <div className="log-meta">
              <span>{item.status}</span>
              <time>{item.publishDate || '公開日未定'}</time>
              {item.publicUrl ? (
                <a href={item.publicUrl} target="_blank" rel="noreferrer">
                  開く
                </a>
              ) : (
                <span>URL未設定</span>
              )}
            </div>
          </article>
        ))}
        {items.length === 0 && <p className="empty-copy">ログに表示できる投稿はまだありません。</p>}
      </div>
    </section>
  )
}

function PublishPanel({
  kind,
  items,
  draft,
  setDraft,
  onSubmit,
  onUpdate,
  onDelete,
}: {
  kind: ContentKind
  items: PublishItem[]
  draft: Omit<PublishItem, 'id'>
  setDraft: (draft: Omit<PublishItem, 'id'>) => void
  onSubmit: (event: FormEvent) => void
  onUpdate: (id: string, patch: Partial<PublishItem>) => void
  onDelete: (id: string) => void
}) {
  const isNote = kind === 'note'

  return (
    <div className={isNote ? 'content-layout' : 'post-layout'}>
      <form className="editor-panel" onSubmit={onSubmit}>
        <div className="section-heading">
          <h2>{pageInfo[kind].short}を追加</h2>
          <p>{pageInfo[kind].empty}</p>
        </div>
        {isNote ? (
          <label>
            タイトル
            <input
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="タイトルを入力"
            />
          </label>
        ) : (
          <>
            <label>
              本文
              <textarea
                className="post-textarea"
                value={draft.body || ''}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                placeholder="投稿本文を書く"
              />
            </label>
            <label>
              メモ
              <textarea
                value={draft.memo || ''}
                onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
                placeholder="狙い、補足、次に直すこと"
              />
            </label>
          </>
        )}
        <div className="field-row">
          <label>
            ステータス
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value as PublishStatus })}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            公開日
            <input
              type="date"
              value={draft.publishDate}
              onChange={(event) => setDraft({ ...draft, publishDate: event.target.value })}
            />
          </label>
        </div>
        <label>
          公開URL
          <input
            value={draft.publicUrl}
            onChange={(event) => setDraft({ ...draft, publicUrl: event.target.value })}
            placeholder="https://"
            inputMode="url"
          />
        </label>
        <button className="primary-button" type="submit">
          追加
        </button>
      </form>

      <section className="table-panel">
        <div className="section-heading">
          <h2>{pageInfo[kind].label}</h2>
          <p>{items.length}件</p>
        </div>
        <div className="item-list">
          {items.map((item) => (
            <article className="publish-card" key={item.id}>
              {isNote ? (
                <input
                  className="title-input"
                  value={item.title || ''}
                  onChange={(event) => onUpdate(item.id, { title: event.target.value })}
                  aria-label="タイトル"
                />
              ) : (
                <div className="post-edit-grid">
                  <label>
                    本文
                    <textarea
                      className="post-textarea"
                      value={item.body || ''}
                      onChange={(event) => onUpdate(item.id, { body: event.target.value })}
                    />
                  </label>
                  <label>
                    メモ
                    <textarea
                      value={item.memo || ''}
                      onChange={(event) => onUpdate(item.id, { memo: event.target.value })}
                    />
                  </label>
                </div>
              )}
              <div className="field-row">
                <label>
                  ステータス
                  <select
                    value={item.status}
                    onChange={(event) => onUpdate(item.id, { status: event.target.value as PublishStatus })}
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  公開日
                  <input
                    type="date"
                    value={item.publishDate}
                    onChange={(event) => onUpdate(item.id, { publishDate: event.target.value })}
                  />
                </label>
              </div>
              <label>
                公開URL
                <input
                  value={item.publicUrl}
                  onChange={(event) => onUpdate(item.id, { publicUrl: event.target.value })}
                  placeholder="https://"
                  inputMode="url"
                />
              </label>
              <div className="card-actions">
                {item.publicUrl ? (
                  <a href={item.publicUrl} target="_blank" rel="noreferrer">
                    開く
                  </a>
                ) : (
                  <span>URL未設定</span>
                )}
                <button type="button" className="delete-button" onClick={() => onDelete(item.id)}>
                  削除
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="empty-copy">{pageInfo[kind].empty}</p>}
        </div>
      </section>
    </div>
  )
}

function MemoPanel({
  items,
  draft,
  setDraft,
  onSubmit,
  onUpdate,
  onDelete,
}: {
  items: MemoItem[]
  draft: Omit<MemoItem, 'id'>
  setDraft: (draft: Omit<MemoItem, 'id'>) => void
  onSubmit: (event: FormEvent) => void
  onUpdate: (id: string, patch: Partial<MemoItem>) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="content-layout">
      <form className="editor-panel" onSubmit={onSubmit}>
        <div className="section-heading">
          <h2>仮メモを追加</h2>
          <p>まだ記事にする前の断片を置いておけます</p>
        </div>
        <label>
          メモ
          <textarea
            value={draft.memo}
            onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
            placeholder="思いついたこと"
          />
        </label>
        <label>
          補足
          <textarea
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="背景、用途、次にやること"
          />
        </label>
        <button className="primary-button" type="submit">
          追加
        </button>
      </form>

      <section className="table-panel">
        <div className="section-heading">
          <h2>仮メモページ</h2>
          <p>{items.length}件</p>
        </div>
        <div className="item-list">
          {items.map((item) => (
            <article className="memo-card" key={item.id}>
              <label>
                メモ
                <textarea value={item.memo} onChange={(event) => onUpdate(item.id, { memo: event.target.value })} />
              </label>
              <label>
                補足
                <textarea value={item.note} onChange={(event) => onUpdate(item.id, { note: event.target.value })} />
              </label>
              <div className="card-actions">
                <span>仮保存中</span>
                <button type="button" className="delete-button" onClick={() => onDelete(item.id)}>
                  削除
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="empty-copy">仮メモはまだありません。</p>}
        </div>
      </section>
    </div>
  )
}

export default App
