/**
 * Text-to-Speech service using OpenAI TTS
 */

import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Store audio files temporarily
const AUDIO_DIR = '/tmp/audio';

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Map of audio IDs to file paths (for cleanup)
const audioFiles = new Map();

/**
 * Convert text to speech and save to a temporary file
 * Returns the audio ID (used to construct the URL)
 */
export async function textToSpeech(text) {
  try {
    // Limit text length for TTS (OpenAI has limits)
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
    
    console.log('🔊 Generating speech for:', truncatedText.substring(0, 50) + '...');
    
    const response = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Options: alloy, echo, fable, onyx, nova, shimmer
      input: truncatedText,
      response_format: 'mp3',
    });
    
    // Generate unique ID for this audio
    const audioId = randomUUID();
    const fileName = `${audioId}.mp3`;
    const filePath = path.join(AUDIO_DIR, fileName);
    
    // Save the audio file
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    console.log('🔊 Audio saved:', filePath, 'size:', buffer.length);
    
    // Track for cleanup
    audioFiles.set(audioId, {
      path: filePath,
      createdAt: Date.now(),
    });
    
    // Schedule cleanup after 5 minutes
    setTimeout(() => {
      deleteAudio(audioId);
    }, 5 * 60 * 1000);
    
    return audioId;
  } catch (error) {
    console.error('TTS error:', error);
    throw error;
  }
}

/**
 * Get the file path for an audio ID
 */
export function getAudioPath(audioId) {
  const audio = audioFiles.get(audioId);
  if (audio && fs.existsSync(audio.path)) {
    return audio.path;
  }
  return null;
}

/**
 * Delete an audio file
 */
export function deleteAudio(audioId) {
  const audio = audioFiles.get(audioId);
  if (audio) {
    try {
      if (fs.existsSync(audio.path)) {
        fs.unlinkSync(audio.path);
        console.log('🗑️ Deleted audio:', audioId);
      }
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
    audioFiles.delete(audioId);
  }
}

/**
 * Clean up old audio files (call periodically)
 */
export function cleanupOldAudio() {
  const maxAge = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();
  
  for (const [audioId, audio] of audioFiles) {
    if (now - audio.createdAt > maxAge) {
      deleteAudio(audioId);
    }
  }
}

