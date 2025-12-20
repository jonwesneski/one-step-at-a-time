'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <div
        id="music-composition"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '900px',
          border: '1px solid red',
        }}
      >
        {[1, 2, 3].map((item) => (
          <div
            id="music-measure"
            key={item}
            style={{
              flex: '1 1 100px',
              border: '1px solid blue',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ display: 'block' }}>item</span>
            <div
              id={'music-staff-treble'}
              // style={{
              //   flex: '1 1 100px',
              //   border: '1px solid blue',
              //   boxSizing: 'border-box',
              // }}
            >
              <svg
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
                style={{
                  width: '100%',
                  height: '100px',
                  display: 'block',
                  background: '#eee',
                }}
              >
                <line x1="0" y1="0" x2="0" y2="100" stroke="black" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="black" />
                <line x1="200" y1="0" x2="200" y2="100" stroke="black" />
              </svg>
            </div>
            <span style={{ display: 'block' }}>item</span>
            <div
              id="music-staff-treble"
              // style={{
              //   flex: '1 1 100px',
              //   border: '1px solid blue',
              //   boxSizing: 'border-box',
              // }}
            >
              <svg
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
                style={{
                  width: '100%',
                  height: '100px',
                  display: 'block',
                  background: '#eee',
                }}
              >
                <line x1="0" y1="0" x2="0" y2="100" stroke="black" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="black" />
                <line x1="200" y1="0" x2="200" y2="100" stroke="black" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
