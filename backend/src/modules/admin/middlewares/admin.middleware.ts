// Admin middleware — ensures the user has admin role
import { authorize } from '../../../common/middleware/roles.middleware';

export const requireAdmin = authorize('admin');
