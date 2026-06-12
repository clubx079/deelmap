// Skeleton for /community/p/[slug] — mirrors the real layout so the
// transition to real content doesn't shift anything around. Uses Tailwind's
// `animate-pulse` for the shimmer effect.

const bar = 'bg-[#F3F3EF] rounded animate-pulse'

export function PostDetailSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-3 w-20 ${bar}`} />
        <div className={`h-3 w-2 ${bar}`} />
        <div className={`h-3 w-24 ${bar}`} />
        <div className={`h-3 w-2 ${bar}`} />
        <div className={`h-3 w-48 ${bar}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">

        <main>
          {/* Post card */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden grid grid-cols-[60px_1fr] md:grid-cols-[64px_1fr]">
            {/* Vote rail */}
            <div className="bg-[#FAFAF8] border-r border-[#E8E8E4] flex flex-col items-center gap-1.5 py-3">
              <div className={`w-6 h-6 ${bar}`} />
              <div className={`w-7 h-3 ${bar}`} />
              <div className={`w-5 h-2 ${bar}`} />
              <div className={`w-6 h-6 ${bar}`} />
            </div>
            {/* Body */}
            <div className="p-5 md:p-7">
              {/* Tag chips */}
              <div className="flex gap-2 mb-4">
                <div className={`h-5 w-24 ${bar}`} />
                <div className={`h-5 w-20 ${bar}`} />
              </div>
              {/* Title */}
              <div className="space-y-2.5 mb-5">
                <div className={`h-7 w-full ${bar}`} />
                <div className={`h-7 w-5/6 ${bar}`} />
                <div className={`h-7 w-2/3 ${bar}`} />
              </div>
              {/* Author block */}
              <div className="flex items-center gap-3 p-3 bg-[#FAFAF8] border border-[#E8E8E4] rounded mb-5">
                <div className={`w-10 h-10 rounded-full ${bar}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3.5 w-32 ${bar}`} />
                  <div className={`h-3 w-48 ${bar}`} />
                </div>
              </div>
              {/* Body lines */}
              <div className="space-y-2.5 max-w-[720px]">
                <div className={`h-3.5 w-full ${bar}`} />
                <div className={`h-3.5 w-full ${bar}`} />
                <div className={`h-3.5 w-11/12 ${bar}`} />
                <div className={`h-3.5 w-full ${bar}`} />
                <div className={`h-3.5 w-4/5 ${bar}`} />
              </div>
              {/* Deal card */}
              <div className="mt-5 max-w-[720px] h-20 bg-[#ECFDF5] border border-[#BBF7D0] rounded flex items-center gap-3 px-4">
                <div className={`w-14 h-14 rounded ${bar}`} style={{ background: '#D1FAE5' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded animate-pulse" style={{ background: '#BBF7D0' }} />
                  <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: '#BBF7D0' }} />
                </div>
                <div className="h-8 w-24 rounded animate-pulse" style={{ background: '#BBF7D0' }} />
              </div>
              {/* Action bar */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#F3F3EF]">
                <div className={`h-7 w-24 ${bar}`} />
                <div className={`h-7 w-16 ${bar}`} />
                <div className={`h-7 w-16 ${bar}`} />
                <div className={`h-7 w-16 ml-auto ${bar}`} />
              </div>
            </div>
          </div>

          {/* Comments header */}
          <div className="flex items-center gap-3 mt-7 mb-3">
            <div className={`h-5 w-28 ${bar}`} />
            <div className={`h-9 w-44 ml-auto ${bar}`} />
          </div>

          {/* Composer */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <div className={`w-7 h-7 rounded-full ${bar}`} />
              <div className={`h-3 w-40 ${bar}`} />
              <div className={`h-3 w-20 ml-auto ${bar}`} />
            </div>
            <div className="h-24" />
            <div className="bg-[#FAFAF8] border-t border-[#E8E8E4] h-12 flex items-center px-3 gap-2">
              <div className={`h-7 w-7 ${bar}`} />
              <div className={`h-7 w-7 ${bar}`} />
              <div className={`h-7 w-7 ${bar}`} />
              <div className={`h-8 w-20 ml-auto ${bar}`} />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E8E8E4] rounded p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-6 h-6 rounded-full ${bar}`} />
                  <div className={`h-3 w-24 ${bar}`} />
                  <div className={`h-4 w-20 ${bar}`} />
                  <div className={`h-3 w-12 ${bar}`} />
                </div>
                <div className="space-y-2 mb-3">
                  <div className={`h-3.5 w-full ${bar}`} />
                  <div className={`h-3.5 w-11/12 ${bar}`} />
                  <div className={`h-3.5 w-3/4 ${bar}`} />
                </div>
                <div className="flex gap-1.5">
                  <div className={`h-6 w-14 ${bar}`} />
                  <div className={`h-6 w-6 ${bar}`} />
                  <div className={`h-6 w-14 ${bar}`} />
                  <div className={`h-6 w-14 ${bar}`} />
                  <div className={`h-6 w-16 ${bar}`} />
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right rail */}
        <aside className="hidden lg:block space-y-3.5">
          {[
            { title: 24, body: 'tall' },
            { title: 36, body: 'short' },
            { title: 32, body: 'tall' },
            { title: 20, body: 'short' },
          ].map((card, i) => (
            <div key={i} className="bg-white border border-[#E8E8E4] rounded p-4 space-y-3">
              <div className={`h-3 w-${card.title} ${bar}`} />
              {card.body === 'tall' ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded ${bar}`} />
                    <div className="flex-1 space-y-1.5">
                      <div className={`h-3.5 w-24 ${bar}`} />
                      <div className={`h-2.5 w-32 ${bar}`} />
                    </div>
                  </div>
                  <div className={`h-9 w-full ${bar}`} />
                </>
              ) : (
                <>
                  <div className={`h-3 w-full ${bar}`} />
                  <div className={`h-3 w-5/6 ${bar}`} />
                  <div className={`h-3 w-4/6 ${bar}`} />
                </>
              )}
            </div>
          ))}
        </aside>
      </div>
    </>
  )
}
