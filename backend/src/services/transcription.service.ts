import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { openRouter } from '../config/ai';

export const transcriptionService = {
  /**
   * Transcreve um áudio usando modelos multimodais do OpenRouter (ex: Gemini 1.5 Flash)
   */
  async transcribe(audioUrl: string, model: string = 'google/gemini-flash-1.5'): Promise<string> {
    const tempFilePath = path.join(process.cwd(), 'tmp', `audio_${Date.now()}.oga`);
    
    // Certifica que a pasta tmp existe
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'));
    }

    try {
      // 1. Download do áudio
      const response = await axios({
        method: 'GET',
        url: audioUrl,
        responseType: 'arraybuffer',
      });
      
      fs.writeFileSync(tempFilePath, response.data);

      // 2. Converte para Base64
      const audioBase64 = response.data.toString('base64');

      // 3. Chamada ao OpenRouter
      const completion = await openRouter.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um transcritor de áudio especializado. Sua única tarefa é ouvir o áudio fornecido e transcrevê-lo exatamente como foi dito, mantendo gírias e pontuação natural. Não adicione comentários próprios, retorne apenas o texto transcrito.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva este áudio exatamente como dito:',
              },
              {
                type: 'image_url', // OpenRouter e Gemini usam formatos variados para áudio, mas no Chat V1 costuma ser via prompt multimodal
                image_url: {
                  url: `data:audio/oga;base64,${audioBase64}`,
                },
              } as any,
            ],
          },
        ],
      });

      const transcription = completion.choices[0]?.message?.content || '';

      // 4. Limpeza (Deletar arquivo temporário)
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      return transcription.trim();
    } catch (error) {
      console.error('❌ Erro na transcrição:', error);
      
      // Limpeza em caso de erro
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      throw new Error('Falha ao transcrever áudio.');
    }
  },
};
