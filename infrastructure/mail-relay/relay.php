<?php
declare(strict_types=1);
use PHPMailer\PHPMailer\PHPMailer;
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
function reply(int $status, array $body): void { http_response_code($status); echo json_encode($body); exit; }
$private = __DIR__ . '/_private';
if (!is_file($private . '/config.php')) reply(503, ['ready'=>false]);
$config = require $private . '/config.php';
if (!is_array($config) || empty($config['user']) || empty($config['password']) || strlen($config['keys']['madbeauty'] ?? '') < 48 || strlen($config['keys']['dovanos123'] ?? '') < 48) reply(503, ['ready'=>false]);
if ($_SERVER['REQUEST_METHOD'] === 'GET') reply(200, ['service'=>'niche-transactional-mail','ready'=>true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error'=>'Method unavailable']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 24576) reply(413, ['error'=>'Too large']);
$raw = file_get_contents('php://input', false, null, 0, 24577);
if ($raw === false || strlen($raw) > 24576) reply(413, ['error'=>'Too large']);
$site = $_SERVER['HTTP_X_RELEASE_SITE'] ?? '';
$time = $_SERVER['HTTP_X_RELEASE_TIME'] ?? '';
$signature = $_SERVER['HTTP_X_RELEASE_SIGNATURE'] ?? '';
if (!isset($config['keys'][$site]) || !preg_match('/^\d{13}$/D', $time) || abs((int)round(microtime(true)*1000)-(int)$time)>300000 || !preg_match('/^[a-f0-9]{64}$/D', $signature) || !hash_equals(hash_hmac('sha256', $time."\n".$raw, $config['keys'][$site]), $signature)) reply(401, ['error'=>'Unauthorized']);
$message = json_decode($raw, true);
if (!is_array($message) || array_diff(array_keys($message), ['to','subject','text','id','replyTo']) || !preg_match('/^[a-z0-9-]{1,100}$/iD', $message['id'] ?? '') || !is_string($message['subject'] ?? null) || strlen($message['subject'])>400 || preg_match('/[\r\n]/', $message['subject']) || !is_string($message['text'] ?? null) || strlen($message['text'])>20000 || !filter_var($message['to'] ?? '', FILTER_VALIDATE_EMAIL) || (isset($message['replyTo']) && !filter_var($message['replyTo'], FILTER_VALIDATE_EMAIL))) reply(400, ['error'=>'Invalid message']);
if ($site === 'dovanos123' && $message['to'] !== $config['user']) reply(400, ['error'=>'Invalid recipient']);
if ($site === 'madbeauty' && !in_array($message['subject'], ['Madbeauty prisijungimo kodas','Madbeauty vizito atnaujinimas'], true)) reply(400, ['error'=>'Invalid purpose']);
$handle = fopen($private.'/receipts.json', 'c+');
if ($handle === false) reply(503, ['error'=>'Storage unavailable']);
chmod($private.'/receipts.json', 0600);
if (!flock($handle, LOCK_EX|LOCK_NB)) { fclose($handle); header('Retry-After: 30'); reply(429, ['error'=>'Busy']); }
try {
 $stored = stream_get_contents($handle, 2097153);
 if ($stored === false || strlen($stored)>2097152) throw new RuntimeException('Capacity');
 $receipts = $stored === '' ? [] : json_decode($stored, true, 512, JSON_THROW_ON_ERROR);
 if (!is_array($receipts)) throw new RuntimeException('Storage');
 foreach ($receipts as $key=>$value) if ($value['at']<time()-30*86400) unset($receipts[$key]);
 $id = $site.'-'.$message['id']; $hash = hash('sha256', $raw);
 if (isset($receipts[$id])) { if (!hash_equals($receipts[$id]['hash'], $hash)) throw new RuntimeException('Conflict'); }
 else {
  if (count($receipts)>=10000) throw new RuntimeException('Capacity');
  require $private.'/Exception.php'; require $private.'/PHPMailer.php'; require $private.'/SMTP.php';
  $mail = new PHPMailer(true); $mail->isSMTP(); $mail->Host='smtp.hostinger.com'; $mail->Port=465;
  $mail->SMTPAuth=true; $mail->SMTPSecure=PHPMailer::ENCRYPTION_SMTPS; $mail->SMTPDebug=0; $mail->Timeout=15;
  $mail->SMTPOptions=['ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false]];
  $mail->Username=$config['user']; $mail->Password=$config['password']; $mail->setFrom($config['user'], 'MB Pinet');
  $mail->addAddress($message['to']); if (!empty($message['replyTo']) && $message['replyTo'] !== $config['user']) $mail->addReplyTo($message['replyTo']);
  $mail->CharSet='UTF-8'; $mail->Encoding='base64'; $mail->Subject=$message['subject']; $mail->Body=$message['text'];
  $mail->MessageID='<'.$message['id'].'@'.explode('@', $config['user'])[1].'>';
  $mail->send();
  // Acceptance/restart gaps are at-least-once; stable Message-ID is retained on every retry.
  $receipts[$id]=['hash'=>$hash,'at'=>time()]; $encoded=json_encode($receipts, JSON_THROW_ON_ERROR);
  rewind($handle); if (fwrite($handle, $encoded)!==strlen($encoded) || !ftruncate($handle, strlen($encoded)) || !fflush($handle)) throw new RuntimeException('Storage');
 }
 flock($handle, LOCK_UN); fclose($handle); reply(200, ['accepted'=>true]);
} catch (Throwable $error) { flock($handle, LOCK_UN); fclose($handle); reply(503, ['error'=>'Delivery unavailable']); }
