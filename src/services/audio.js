/**
 * Audio transcription service using OpenAI Whisper
 */

import OpenAI, { toFile } from 'openai';

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Download audio from Twilio and transcribe with Whisper
 */
export async function transcribeAudio(mediaUrl) {
  try {
    console.log('🎤 Downloading audio from:', mediaUrl);
    
    // Download the audio file from Twilio (requires auth)
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    // Get the audio as a buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log('🎤 Downloaded audio, size:', audioBuffer.length, 'bytes');
    
    // Convert to a file object that OpenAI accepts
    const audioFile = await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });
    
    console.log('🎤 Transcribing with Whisper...');
    
    // Transcribe with Whisper
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
    
    console.log('🎤 Transcription result:', transcription.text);
    
    return transcription.text;
  } catch (error) {
    console.error('Audio transcription error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

/**
 * Check if a message contains audio
 */
export function isAudioMessage(twilioBody) {
  const numMedia = parseInt(twilioBody.NumMedia || '0', 10);
  if (numMedia === 0) return false;
  
  const contentType = twilioBody.MediaContentType0 || '';
  console.log('📎 Media detected - type:', contentType, 'count:', numMedia);
  return contentType.startsWith('audio/');
}

/**
 * Get audio URL from Twilio message
 */
export function getAudioUrl(twilioBody) {
  return twilioBody.MediaUrl0;
}
