<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

require_once __DIR__ . '/HttpClient.php';

/**
 * Server-side Google Gemini API client.
 *
 * Sends only allowlisted training metrics and the current chat question.
 * The API key never leaves the server. Provider outages return a structured
 * failure so the training planner can use its deterministic fallback.
 */
class GeminiService {

    /** @var array */
    private $config;

    /** @var HttpClient */
    private $http;

    public function __construct(?array $config = null, ?HttpClient $http = null)
    {
        if ($config !== null) {
            $this->config = $config;
        } elseif (function_exists('integration_config')) {
            $this->config = integration_config('gemini');
        } else {
            $this->config = array();
        }

        $timeout = max(3, min(60, (int) ($this->config['timeout'] ?? 25)));
        $this->http = $http ?: new HttpClient($timeout);
    }

    public function is_ready()
    {
        $enabled = filter_var($this->config['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $api_key = trim((string) ($this->config['api_key'] ?? ''));
        $model = trim((string) ($this->config['model'] ?? ''));

        return $enabled === true
            && $api_key !== ''
            && $model !== ''
            && preg_match('/^[A-Za-z0-9._-]+$/', $model) === 1;
    }

    public function monthly_cap()
    {
        return max(1, (int) ($this->config['monthly_call_cap'] ?? 500));
    }

    public function model_name()
    {
        return (string) ($this->config['model'] ?? 'gemini-3.8-flash');
    }

    public function generate_weekly_feedback(array $metrics)
    {
        if (!$this->is_ready()) {
            return $this->failure('not_configured', 'Google Gemini is disabled or not configured.');
        }

        $system = 'You are an encouraging, safety-first distance running coach inside RunPlan. '
            . 'Write 3 to 5 concise plain-text sentences reviewing the runner\'s past 7 days based strictly '
            . 'on the provided JSON metrics, followed by 2 short actionable focus points for next week. '
            . 'Do not invent runs, use markdown headings, or give medical diagnoses.';
        $prompt = "Weekly first-party training summary (JSON):\n"
            . json_encode($this->sanitize_metrics($metrics), JSON_UNESCAPED_SLASHES);

        return $this->send_message($system, $prompt, 450);
    }

    public function generate_plan_brief(array $plan_summary)
    {
        if (!$this->is_ready()) {
            return $this->failure('not_configured', 'Google Gemini is disabled or not configured.');
        }

        $allowed = array(
            'goal', 'experience', 'start_date', 'end_date',
            'weeks', 'sessions_per_week', 'total_km', 'peak_long_km',
        );
        $safe = array();
        foreach ($allowed as $key) {
            if (array_key_exists($key, $plan_summary)
                && (is_scalar($plan_summary[$key]) || $plan_summary[$key] === null)) {
                $safe[$key] = $plan_summary[$key];
            }
        }

        $system = 'You are a supportive distance running coach inside RunPlan. '
            . 'Write a 2 to 3 sentence plain-text overview for this generated training schedule. '
            . 'Do not alter distances or dates and do not provide medical advice.';
        $prompt = "Draft training block summary (JSON):\n"
            . json_encode($safe, JSON_UNESCAPED_SLASHES);

        return $this->send_message($system, $prompt, 260);
    }

    public function generate_chat_answer($question, array $metrics)
    {
        if (!$this->is_ready()) {
            return $this->failure('not_configured', 'Google Gemini is disabled or not configured.');
        }

        $question = trim(strip_tags((string) $question));
        $question = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $question);
        if (!is_string($question) || $question === '' || mb_strlen($question) > 1000) {
            return $this->failure('invalid_request', 'Enter a question under 1000 characters.');
        }

        $system = 'You are RunPlan AI, a supportive, safety-first distance running coach. '
            . 'Answer the runner\'s question clearly and concisely using only the training metrics provided. '
            . 'If the metrics do not answer the question, say what is missing instead of guessing. '
            . 'Do not give medical diagnoses or change the validated training plan.';
        $prompt = "Runner question:\n" . $question
            . "\n\nSelected first-party training metrics (JSON):\n"
            . json_encode($this->sanitize_metrics($metrics), JSON_UNESCAPED_SLASHES);

        return $this->send_message($system, $prompt, 700);
    }

    private function sanitize_metrics(array $metrics)
    {
        $allowed = array(
            'period_start', 'period_end', 'goal', 'experience',
            'runs_logged', 'distance_km', 'duration_seconds',
            'avg_effort', 'longest_run_km',
            'sessions_completed', 'sessions_planned', 'sessions_skipped', 'sessions_missed',
        );

        $safe = array();
        foreach ($allowed as $key) {
            if (array_key_exists($key, $metrics)
                && (is_scalar($metrics[$key]) || $metrics[$key] === null)) {
                $safe[$key] = $metrics[$key];
            }
        }
        return $safe;
    }

    private function send_message($system_prompt, $user_prompt, $max_tokens_cap)
    {
        $base_uri = rtrim((string) ($this->config['base_uri'] ?? 'https://generativelanguage.googleapis.com/v1beta/models'), '/');
        $api_key = trim((string) ($this->config['api_key'] ?? ''));
        $model = $this->model_name();
        $max_tokens = min((int) $max_tokens_cap, max(128, (int) ($this->config['max_tokens'] ?? 3000)));
        $timeout = max(3, min(60, (int) ($this->config['timeout'] ?? 25)));

        if (preg_match('/^[A-Za-z0-9._-]+$/', $model) !== 1) {
            return $this->failure('configuration', 'The configured Gemini model name is invalid.');
        }

        $response = $this->http->post_json(
            $base_uri . '/' . rawurlencode($model) . ':generateContent',
            array(
                'systemInstruction' => array(
                    'parts' => array(array('text' => $system_prompt)),
                ),
                'contents' => array(
                    array(
                        'role' => 'user',
                        'parts' => array(array('text' => $user_prompt)),
                    ),
                ),
                'generationConfig' => array(
                    'temperature' => 0.4,
                    'maxOutputTokens' => $max_tokens,
                ),
            ),
            array(
                'timeout' => $timeout,
                'headers' => array('x-goog-api-key: ' . $api_key),
            )
        );

        if (!$response['ok'] || !is_array($response['data'])) {
            return $this->failure('fallback', $this->safe_provider_error((int) ($response['status'] ?? 0)));
        }

        $text = $this->extract_text($response['data']);
        if ($text === '') {
            return $this->failure('fallback', 'Gemini returned no usable text. Check the model and safety settings.');
        }

        return array(
            'ok' => true,
            'text' => $text,
            'provider_status' => 'ok',
            'error' => null,
        );
    }

    private function extract_text(array $data)
    {
        $parts = $data['candidates'][0]['content']['parts'] ?? array();
        if (!is_array($parts)) return '';

        $text = array();
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text']) && is_string($part['text'])) {
                $value = trim($part['text']);
                if ($value !== '') $text[] = $value;
            }
        }
        return mb_substr(implode("\n\n", $text), 0, 4000);
    }

    private function safe_provider_error($status)
    {
        if ($status === 400 || $status === 404) {
            return 'Gemini rejected the request. Check GEMINI_MODEL and the request settings.';
        }
        if ($status === 401 || $status === 403) {
            return 'Gemini access was denied. Check that the API key is valid and Gemini API access is enabled.';
        }
        if ($status === 429) {
            return 'Gemini quota is currently exhausted. Try again later or review your API quota.';
        }
        return 'Gemini is temporarily unavailable. Please try again in a moment.';
    }

    private function failure($status, $message)
    {
        return array(
            'ok' => false,
            'text' => null,
            'provider_status' => $status,
            'error' => $message,
        );
    }
}
