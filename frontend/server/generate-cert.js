import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';

const certDir = path.resolve(process.cwd(), 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const attrs = [{ name: 'commonName', value: 'localhost' }];
const opts = {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
};

(async () => {
  const { private: key, cert } = await selfsigned.generate(attrs, opts);

  fs.writeFileSync(path.join(certDir, 'localhost-key.pem'), key, 'utf8');
  fs.writeFileSync(path.join(certDir, 'localhost.pem'), cert, 'utf8');

  console.log('Generated local HTTPS certs:');
  console.log('  certs/localhost-key.pem');
  console.log('  certs/localhost.pem');
  console.log('You can now set SSL_KEY_PATH and SSL_CERT_PATH in .env.local.');
})();
