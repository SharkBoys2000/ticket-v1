'use client';

import GuideImages, { imageUrl, readGuideImage } from './GuideImages.jsx';
import { useEffect, useState } from 'react';

const empty = {
  title: '',
  category: '',
  symptom: '',
  steps: '',
  verification: '',
  images: [],
};

export default function GuideLibrary() {
  const [data, setData] = useState(null);
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setError('');
    setData(null);

    fetch(
      '/api/guides?q=' + encodeURIComponent(search) + '&page=' + page,
      {
        signal: controller.signal,
        cache: 'no-store',
      },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error.message);
      });

    return () => controller.abort();
  }, [search, page, version]);

  async function addImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) return;
    if ((edit.images?.length || 0) + files.length > 6) {
      setError('เพิ่มได้สูงสุด 6 รูปต่อคู่มือ');
      return;
    }

    setImageBusy(true);
    setError('');

    try {
      const images = [];
      for (const file of files) {
        images.push(await readGuideImage(file));
      }
      setEdit((previousEdit) => ({
        ...previousEdit,
        images: [...(previousEdit.images || []), ...images],
      }));
    } catch (error) {
      setError(error.message || 'เปิดรูปไม่สำเร็จ');
    } finally {
      setImageBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch(
        '/api/guides' + (edit._id ? '/' + edit._id : ''),
        {
          method: edit._id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edit),
          signal: AbortSignal.timeout(30000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setEdit(null);
      setVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setError(
        error.name === 'TimeoutError'
          ? 'ยังยืนยันผลไม่ได้ กรุณาค้นหาคู่มือก่อนลองบันทึกใหม่'
          : error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <nav className="main-nav">
        <a href="/dashboard">คำร้องและรายงาน</a>
        <a href="/guides" aria-current="page">
          คู่มือการแก้ปัญหา
        </a>
      </nav>
      <header>
        <div>
          <span className="eyebrow">คู่มือภายในทีม</span>
          <h1>คลังขั้นตอนการแก้ปัญหา</h1>
          <p>เก็บวิธีทำงานให้พนักงานใหม่ค้นหา อ่าน และทำตามได้</p>
        </div>
        <button
          onClick={() => {
            setEdit({ ...empty });
            setError('');
          }}
          disabled={!!edit}
        >
          + เพิ่มคู่มือ
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {edit ? (
        <form className="guide-form panel" onSubmit={save}>
          <h2>{edit._id ? 'แก้ไขคู่มือ' : 'คู่มือใหม่'}</h2>
          {[
            ['title', 'ชื่อเรื่อง', 150, 1],
            ['category', 'หมวดหมู่ เช่น การใช้งาน / การชำระเงิน', 80, 1],
            ['symptom', 'อาการหรือปัญหาที่พบ', 4000, 3],
            ['steps', 'ขั้นตอนแก้ไข (เรียงข้อ 1, 2, 3 …)', 20000, 10],
            ['verification', 'วิธีตรวจผล / ข้อควรระวัง', 4000, 4],
          ].map(([key, label, max, rows]) => (
            <label key={key}>
              {label}
              {rows === 1 ? (
                <input
                  disabled={busy}
                  maxLength={max}
                  required={key === 'title'}
                  value={edit[key]}
                  onChange={(event) =>
                    setEdit({ ...edit, [key]: event.target.value })
                  }
                />
              ) : (
                <textarea
                  disabled={busy}
                  rows={rows}
                  maxLength={max}
                  required={key === 'symptom' || key === 'steps'}
                  value={edit[key]}
                  onChange={(event) =>
                    setEdit({ ...edit, [key]: event.target.value })
                  }
                />
              )}
            </label>
          ))}
          <section className="guide-image-editor">
            <h3>รูปประกอบขั้นตอน</h3>
            <p>
              เพิ่มได้สูงสุด 6 รูป · JPG, PNG, WebP · ไม่เกิน 10 MB ต่อไฟล์
              ระบบจะย่อภาพก่อนบันทึก
            </p>
            <label>
              เลือกรูปประกอบ
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={
                  busy || imageBusy || (edit.images?.length || 0) >= 6
                }
                onChange={addImages}
              />
            </label>
            {imageBusy && <p role="status">กำลังเตรียมรูป…</p>}
            <div className="guide-image-grid">
              {(edit.images || []).map((image, index) => (
                <figure key={image.id || image.dataUrl}>
                  <img
                    src={imageUrl(edit._id, image)}
                    alt={'ตัวอย่างรูปที่ ' + (index + 1)}
                  />
                  <label>
                    คำอธิบายรูปที่ {index + 1}
                    <input
                      maxLength={300}
                      value={image.caption || ''}
                      disabled={busy || imageBusy}
                      onChange={(event) =>
                        setEdit({
                          ...edit,
                          images: edit.images.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, caption: event.target.value }
                              : item,
                          ),
                        })
                      }
                      placeholder="เช่น ขั้นตอนที่ 1: เปิดหน้าตั้งค่า"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || imageBusy}
                    onClick={() =>
                      setEdit({
                        ...edit,
                        images: edit.images.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    ลบรูปนี้
                  </button>
                </figure>
              ))}
            </div>
            <small>รูปจะถูกบันทึกหรือลบเมื่อกด “บันทึกคู่มือ”</small>
          </section>
          <div className="form-actions">
            <button disabled={busy || imageBusy} type="submit">
              {busy ? 'กำลังบันทึก…' : 'บันทึกคู่มือ'}
            </button>
            <button
              disabled={busy || imageBusy}
              type="button"
              onClick={() => setEdit(null)}
            >
              ปิดแบบฟอร์ม
            </button>
          </div>
        </form>
      ) : (
        <>
          <form
            className="ticket-filters"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(term);
              setVersion((currentVersion) => currentVersion + 1);
            }}
          >
            <label>
              ค้นหาคู่มือ
              <input
                maxLength={100}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="ชื่อเรื่อง อาการ หมวดหมู่ หรือขั้นตอน"
              />
            </label>
            <button>ค้นหา</button>
          </form>
          <p>{data ? 'พบ ' + data.total + ' คู่มือ' : 'กำลังโหลดคู่มือ…'}</p>
          <div className="guide-list">
            {data?.guides.map((guide) => (
              <article className="panel guide-card" key={guide._id}>
                <span className="guide-category">
                  {guide.category || 'ทั่วไป'}
                </span>
                <h2>{guide.title}</h2>
                <p className="guide-text">{guide.symptom}</p>
                <details>
                  <summary>อ่านขั้นตอนการแก้ไข</summary>
                  <h3>ขั้นตอนแก้ไข</h3>
                  <div className="guide-text">{guide.steps}</div>
                  {guide.verification && (
                    <>
                      <h3>วิธีตรวจผล / ข้อควรระวัง</h3>
                      <div className="guide-text">{guide.verification}</div>
                    </>
                  )}
                  <GuideImages guide={guide} />
                </details>
                <div className="guide-footer">
                  <small>
                    แก้ไขล่าสุด{' '}
                    {new Date(guide.updatedAt).toLocaleString('th-TH', {
                      timeZone: 'Asia/Bangkok',
                    })}{' '}
                    · รุ่น {guide.revision}
                  </small>
                  <button
                    onClick={() => {
                      setEdit(guide);
                      setError('');
                    }}
                  >
                    แก้ไขคู่มือ
                  </button>
                </div>
              </article>
            ))}
          </div>
          {data?.total === 0 && (
            <div className="empty panel">
              ยังไม่มีคู่มือที่ตรงกับการค้นหา กด “เพิ่มคู่มือ” เพื่อเริ่มบันทึก
            </div>
          )}
          <footer>
            <span>
              หน้า {page} / {Math.max(1, Math.ceil((data?.total || 0) / 20))}
            </span>
            <div>
              <button
                disabled={page === 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                ก่อนหน้า
              </button>
              <button
                disabled={!data || page * 20 >= data.total}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                ถัดไป
              </button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
