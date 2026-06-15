'use client'

import { ShieldCheck } from 'lucide-react'

// Compact dark identity band shown on all profile-hub pages (My Profile, Saved,
// Notifications) so they share one consistent header.
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }

export function ProfileHero({ profile }) {
  if (!profile) return null
  return (
    <div className="bg-[#1A1816] text-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 md:py-5">
        <div className="flex flex-row items-center gap-4 md:gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-linear-to-br from-[#D03839] to-[#FB7185] flex items-center justify-center text-white text-[22px] md:text-[26px] font-extrabold border-[3px] border-white/10 shadow-xl">
              {(profile.handle || '?').slice(0, 1).toUpperCase()}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight leading-none">
                @{profile.handle}
              </h1>
              {profile.role_badge && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#0F6E56]">
                  <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                  Verified {cap(profile.role_badge)}
                </span>
              )}
              {profile.is_moderator && (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#D03839]">
                  Moderator
                </span>
              )}
            </div>
            <div className="text-[13.5px] text-white/70">
              {profile.display_name || 'No display name set'}
            </div>
            {profile.bio && (
              <p className="text-[13px] text-white/80 mt-1.5 leading-relaxed max-w-2xl line-clamp-2">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
