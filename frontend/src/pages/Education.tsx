import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import educationVideoData from '../data/educationVideos.json';
import type { EducationTrack } from '../types/wealthTypes';
import Templates from './Templates';

const learningTracks = (educationVideoData as { tracks: EducationTrack[] }).tracks;

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function Education() {
  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 pt-6 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Finance Education</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Learn by sector with YouTube video tracks and ready-to-use planning templates.
          </p>
        </div>

        {/* Video tracks */}
        <section className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
          <h3 className="font-bold text-slate-100 mb-4">YouTube Learning Tracks</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {learningTracks.map((track) => {
              const primaryVideo = track.videos[0];
              const embedUrl = primaryVideo ? toEmbedUrl(primaryVideo.url) : null;

              return (
                <article key={track.sector} className="rounded-xl border border-[#2A2F38] bg-[#1F2630] p-4 space-y-3">
                  <div>
                    <h4 className="text-slate-100 font-semibold">{track.sector}</h4>
                    <p className="text-xs text-slate-400 mt-1">{track.description}</p>
                  </div>

                  <div className="aspect-video rounded-lg overflow-hidden border border-[#2A2F38] bg-[#0E1117]">
                    {embedUrl ? (
                      <iframe
                        className="w-full h-full"
                        src={embedUrl}
                        title={primaryVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 px-4 text-center">
                        Video link is unavailable for this track.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 truncate">{track.channelHint}</p>
                    {primaryVideo && (
                      <a
                        href={primaryVideo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#2962FF] hover:text-slate-200 transition-colors"
                      >
                        Watch video →
                      </a>
                    )}
                  </div>

                  {track.videos.length > 1 && (
                    <div className="pt-1 border-t border-[#2A2F38]">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">More videos</p>
                      <div className="space-y-1">
                        {track.videos.slice(1).map((video) => (
                          <a
                            key={video.url}
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-slate-300 hover:text-[#2962FF] transition-colors truncate"
                          >
                            {video.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Full Templates Pages */}
        <section className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5 mb-8">
          <Templates />
        </section>
      </div>
    </DashboardLayout>
  );
}
