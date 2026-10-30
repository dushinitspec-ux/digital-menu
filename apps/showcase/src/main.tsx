import { createRoot } from 'react-dom/client';
import { AdminRoot } from '../../admin/src/root';
import { installMockApi } from './mock-api';
import { mountTv } from './tv';

// Сначала подменяем сервер, потом запускаем настоящую панель и «телевизор».
const api = installMockApi();
createRoot(document.getElementById('root')!).render(<AdminRoot router="memory" initialPath="/menu" />);
mountTv(api);
