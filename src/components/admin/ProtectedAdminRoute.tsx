import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, hasAdminAccess, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
          <p className="text-muted-foreground max-w-md">
            Bạn không có quyền để truy cập trang này. 
            Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <a href="/" className="text-primary hover:underline">
              Về trang chủ
            </a>
            <a href="/auth" className="text-primary hover:underline">
              Đăng nhập lại
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
