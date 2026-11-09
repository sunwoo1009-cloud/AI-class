import { Bulbs } from './Bulbs';
import { Cityscape } from './Cityscape';
import { Stall } from './Stall';
import { Steam } from './Steam';
import { StreetLamp } from './StreetLamp';
import { Walker } from './Walker';

/**
 * 개발 확인용. 장면 부품을 하나씩 크게 보여준다.
 * 전체 장면만 보면 어느 부품이 이상한지 짚기 어려워서 따로 둔다.
 * 홈 화면에서 ?parts=1 로 연다.
 */
export function PartsGallery({ onBack }: { onBack: () => void }) {
  return (
    <div className="app" style={{ maxWidth: 'none', paddingBottom: 60 }}>
      <div className="topbar">
        <button className="btn-quiet" onClick={onBack}>
          홈으로
        </button>
        <span className="topbar-title">장면 부품 (개발용)</span>
      </div>

      <p className="muted">
        어느 부품이 이상한지 짚어주시면 그 부품만 고칩니다. 왼쪽이 낮(전구 꺼짐),
        오른쪽이 노을(전구 켜짐)입니다.
      </p>

      {(
        [
          ['노점 전체', 216, 168, (lit: boolean) => <Stall lit={lit} />],
          [
            '전구만',
            180,
            60,
            (lit: boolean) => (
              <Bulbs lit={lit} count={3} width={150} wireTop={8} transform="translate(15 0)" />
            ),
          ],
          [
            '김만',
            90,
            70,
            (lit: boolean) => (
              <Steam transform="translate(30 62)" strength={lit ? 'full' : 'soft'} />
            ),
          ],
          [
            '사람 (걷는 중)',
            90,
            125,
            () => <Walker transform="translate(13 4)" />,
          ],
          [
            '가로등',
            80,
            140,
            (lit: boolean) => (
              <StreetLamp lit={lit} height={116} transform="translate(28 132)" />
            ),
          ],
          [
            '건물과 창 불빛',
            390,
            160,
            (lit: boolean) => (
              <Cityscape lit={lit} width={390} transform="translate(0 155)" />
            ),
          ],
        ] as const
      ).map(([label, w, h, render]) => (
        <section key={label} style={{ marginBottom: 28 }}>
          <h2>{label}</h2>
          <div style={{ display: 'flex', gap: 14 }}>
            {[false, true].map((lit) => (
              <div
                key={String(lit)}
                className="scene-home"
                data-lit={lit}
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: 10,
                  background:
                    'linear-gradient(to bottom, var(--sky-mid), var(--ground))',
                }}
              >
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  style={{ width: '100%', height: 'auto', overflow: 'visible' }}
                >
                  {render(lit)}
                </svg>
              </div>
            ))}
          </div>
        </section>
      ))}

      <h2>전체 장면</h2>
      <p className="muted">
        홈으로 돌아가 <code>?hour=9</code> 와 <code>?hour=20</code> 을 붙여
        비교하세요.
      </p>
    </div>
  );
}
