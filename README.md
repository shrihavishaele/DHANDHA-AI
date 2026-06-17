# Indian Startup Idea Analyzer

A minimal web app to evaluate Indian startup ideas using your provided investor-style system and user prompts.

## Files created
- `package.json`
- `server.js`
- `.gitignore`
- `public/index.html`
- `public/style.css`
- `public/app.js`

## Run locally
1. Open a terminal in `d:\DHANDHA.AI\DHANDHA NEW`
2. Run `npm install`
3. Run `npm start`
4. Open `http://localhost:3000` in your browser

## Usage
- Paste your startup idea into the textarea
- Choose `Simple` for basic idea input or `Advanced` to provide additional fields
- Put your NVIDIA API key in `.env` once, then click `Analyze idea`
- Click `Analyze idea`

If you want to avoid entering credentials every time, create a `.env` file in the project root with the values below.

Example `.env`:

```
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
```

The evaluation now includes India-specific dimensions:
- Problem validation
- TAM/SAM/SOM
- Indian user behavior
- India-focused competition
- Differentiation and monetization
- Distribution and regulation
- Execution complexity and scalability

The app uses the OpenAI SDK with NVIDIA's OpenAI-compatible endpoint and sends your prompt to NVIDIA.
