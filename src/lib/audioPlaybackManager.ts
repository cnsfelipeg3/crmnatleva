// Global single-audio playback manager.
// Ensures only one HTMLAudioElement plays at a time across the whole app.

let currentAudio: HTMLAudioElement | null = null;

export const audioPlaybackManager = {
  /** Call right before .play() — pauses any other audio currently playing. */
  notifyPlay(audio: HTMLAudioElement) {
    if (currentAudio && currentAudio !== audio) {
      try {
        currentAudio.pause();
      } catch {
        /* noop */
      }
    }
    currentAudio = audio;
  },
  /** Call when audio pauses/ends/unmounts to release the slot. */
  release(audio: HTMLAudioElement) {
    if (currentAudio === audio) currentAudio = null;
  },
};
