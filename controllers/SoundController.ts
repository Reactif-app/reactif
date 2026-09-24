import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

import {
  DEFAULT_SOUND_CHOICES,
  getSoundChoices,
  makeTimerSoundSlot,
  ReminderSoundKind,
  resetSoundChoice,
  resetSoundChoices,
  saveSoundChoice,
  SoundAssetName,
  SoundSlot,
  TimerSoundKind,
} from "@/utils/soundChoices";

export type SoundName = SoundSlot;

const SOUND_FILES: Record<SoundAssetName, any> = {
  metronomeTickMp3: require("@/assets/audio/metronome_tick.mp3"),
  beep: require("@/assets/audio/beep.wav"),
  beepShock: require("@/assets/audio/beep_shock.wav"),
  beep2: require("@/assets/audio/Beep2.mp3"),
  beep3: require("@/assets/audio/Beep3.mp3"),
  beep4: require("@/assets/audio/Beep4.mp3"),
};

export class SoundController {
  private sounds: Partial<Record<SoundSlot, AudioPlayer | null>> = {};
  private choices: Record<SoundSlot, SoundAssetName> = {
    ...DEFAULT_SOUND_CHOICES,
  };
  private initialized = false;
  private volume = 1;

  private get slots() {
    return Object.keys(DEFAULT_SOUND_CHOICES) as SoundSlot[];
  }

  private getSource(slot: SoundSlot) {
    const selected = this.choices[slot] ?? DEFAULT_SOUND_CHOICES[slot];
    return SOUND_FILES[selected] ?? SOUND_FILES[DEFAULT_SOUND_CHOICES[slot]];
  }

  private async loadSlot(slot: SoundSlot) {
    try {
      this.sounds[slot]?.remove();
    } catch {
      // ignore remove errors
    }

    try {
      const player = createAudioPlayer(this.getSource(slot));
      player.volume = this.volume;
      this.sounds[slot] = player;
    } catch {
      this.sounds[slot] = null;
    }
  }

  async init() {
    if (this.initialized) return;
    this.choices = await getSoundChoices();

    await setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
    });

    for (const slot of this.slots) {
      await this.loadSlot(slot);
    }

    this.initialized = true;
  }

  async play(slot: SoundSlot) {
    if (!this.initialized) await this.init();
    const sound = this.sounds[slot];
    try {
      if (!sound) return;
      sound.volume = this.volume;
      await sound.seekTo(0);
      sound.play();
    } catch {
      // ignore playback errors
    }
  }

  private previewPlayer: AudioPlayer | null = null;

  async playAsset(assetName: SoundAssetName) {
    if (!this.initialized) await this.init();

    try {
      this.previewPlayer?.remove();
      this.previewPlayer = createAudioPlayer(SOUND_FILES[assetName]);
      this.previewPlayer.volume = this.volume;
      this.previewPlayer.play();
    } catch {
      // ignore preview errors
    }
  }

  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (!this.initialized) {
      await this.init();
      return;
    }

    for (const slot of this.slots) {
      try {
        const sound = this.sounds[slot];
        if (sound) {
          sound.volume = this.volume;
        }
      } catch {
        // ignore volume update errors
      }
    }
  }

  private async wait(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async playReminderPattern(
    kind: ReminderSoundKind,
    timerKind: TimerSoundKind = "generic",
  ) {
    const slot = makeTimerSoundSlot(timerKind, kind);

    if (kind === "end") {
      await this.play(slot);
      return;
    }

    const count = kind === "first" ? 2 : 3;
    for (let i = 0; i < count; i += 1) {
      await this.play(slot);
      if (i < count - 1) {
        await this.wait(220);
      }
    }
  }

  async playTick() {
    return this.play("tick");
  }

  async setSoundChoice(slot: SoundSlot, assetName: SoundAssetName) {
    this.choices = await saveSoundChoice(slot, assetName);
    if (this.initialized) {
      await this.loadSlot(slot);
    }
  }

  async resetSoundChoice(slot: SoundSlot) {
    this.choices = await resetSoundChoice(slot);
    if (this.initialized) {
      await this.loadSlot(slot);
    }
  }

  async resetSoundChoices() {
    this.choices = await resetSoundChoices();
    if (!this.initialized) return;

    for (const slot of this.slots) {
      await this.loadSlot(slot);
    }
  }

  async stopAll() {
    try {
      this.previewPlayer?.pause();
    } catch {}
    for (const slot of this.slots) {
      try {
        this.sounds[slot]?.pause();
      } catch {
        // ignore stop errors
      }
    }
  }

  async dispose() {
    try {
      this.previewPlayer?.remove();
    } catch {}
    this.previewPlayer = null;

    for (const slot of this.slots) {
      try {
        this.sounds[slot]?.remove();
      } catch {}
      this.sounds[slot] = null;
    }
    this.initialized = false;
  }
}

export const soundController = new SoundController();
