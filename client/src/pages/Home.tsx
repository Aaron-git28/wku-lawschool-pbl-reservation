import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format, addDays, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Trash2, Lock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Home() {
  const [mode, setMode] = useState<"select" | "user" | "admin">("select");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [student1Name, setStudent1Name] = useState("");
  const [student1Class, setStudent1Class] = useState("");
  const [student2Name, setStudent2Name] = useState("");
  const [student2Class, setStudent2Class] = useState("");
  const [reservationDate, setReservationDate] = useState<Date | null>(null);

  const utils = trpc.useUtils();
  const { data: rooms = [] } = trpc.studyRoom.list.useQuery();
  
  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 8);
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // 주간 전체 예약 데이터 조회
  const weekReservationQueries = weekDays.map((day) =>
    trpc.reservation.getByDate.useQuery({
      date: format(day, "yyyy-MM-dd"),
    })
  );

  const reservations = useMemo(() => {
    return weekReservationQueries.flatMap((query) => query.data || []);
  }, [weekReservationQueries.map((q) => q.data).join(',')]);

  const createReservation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      toast.success("예약이 완료되었습니다!");
      if (reservationDate) {
        setSelectedDate(reservationDate);
      }
      setStudent1Name("");
      setStudent1Class("");
      setStudent2Name("");
      setStudent2Class("");
      setSelectedRoom(null);
      setSelectedTime(null);
      setReservationDate(null);
      setIsDialogOpen(false);
      utils.reservation.getByDate.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "예약 생성에 실패했습니다.");
    },
  });

  const deleteReservation = trpc.reservation.delete.useMutation({
    onSuccess: () => {
      toast.success("예약이 삭제되었습니다!");
      utils.reservation.getByDate.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "예약 삭제에 실패했습니다.");
    },
  });

  const handleCreateReservation = async () => {
    if (!selectedRoom || selectedTime === null || !student1Name || !student1Class || !student2Name || !student2Class || !reservationDate) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    const reservationDateStr = format(reservationDate, "yyyy-MM-dd");
    const dayOfWeek = reservationDate.getDay();
    if (dayOfWeek === 0) {
      toast.error("일요일에는 예약할 수 없습니다.");
      return;
    }

    await createReservation.mutateAsync({
      roomId: selectedRoom,
      date: reservationDateStr,
      startTime: selectedTime,
      student1Name,
      student1Class,
      student2Name,
      student2Class,
    });
  };

  const handleDeleteReservation = async (reservationId: number) => {
    if (mode !== "admin") {
      toast.error("관리자만 예약을 삭제할 수 있습니다.");
      return;
    }
    await deleteReservation.mutateAsync({ id: reservationId });
  };

  const handleAdminLogin = () => {
    if (adminPassword === "2843") {
      setMode("admin");
      setAdminPassword("");
      toast.success("관리자 모드로 로그인했습니다.");
    } else {
      toast.error("비밀번호가 잘못되었습니다.");
      setAdminPassword("");
    }
  };

  const goToPreviousWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // 모드 선택 화면
  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">원광대 로스쿨 PBL 예약시스템</CardTitle>
            <CardDescription>접속 모드를 선택해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => setMode("user")}>
              이용자 접속
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => setMode("admin")}>
              <Lock className="w-4 h-4 mr-2" />
              관리자 접속
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 관리자 비밀번호 입력 화면
  if (mode === "admin" && adminPassword !== "2843") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">관리자 인증</CardTitle>
            <CardDescription>비밀번호를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <Button className="w-full" onClick={handleAdminLogin}>
              로그인
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setMode("select")}>
              돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 예약 시스템 메인 화면
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">원광대 로스쿨 PBL 예약시스템</h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "admin" ? "관리자 모드" : "이용자 모드"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("select")}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Date Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-2xl font-bold text-foreground">{format(weekStart, "yyyy년 M월")}</h2>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, "d일")} - {format(addDays(weekStart, 5), "d일")}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {mode === "user" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  예약하기
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>스터디룸 예약</DialogTitle>
                  <DialogDescription>2명의 학생 정보를 입력하여 예약해주세요.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {weekDays.map((day, idx) => {
                        const isSelected = reservationDate && format(reservationDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                        return (
                          <Button
                            key={idx}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setReservationDate(day)}
                            className="flex flex-col items-center p-2 h-auto"
                          >
                            <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ko })}</div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>스터디룸</Label>
                    <Select value={selectedRoom !== null ? String(selectedRoom) : ""} onValueChange={(v) => setSelectedRoom(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="스터디룸 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.roomNumber}호
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>시간</Label>
                    <Select value={selectedTime !== null ? String(selectedTime) : ""} onValueChange={(v) => setSelectedTime(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="시간 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time.toString()}>
                            {time}:00 - {time + 1}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>학생1 성명</Label>
                    <Input value={student1Name} onChange={(e) => setStudent1Name(e.target.value)} placeholder="성명" />
                  </div>
                  <div className="space-y-2">
                    <Label>학생1 기수</Label>
                    <Input value={student1Class} onChange={(e) => setStudent1Class(e.target.value)} placeholder="기수" />
                  </div>
                  <div className="space-y-2">
                    <Label>학생2 성명</Label>
                    <Input value={student2Name} onChange={(e) => setStudent2Name(e.target.value)} placeholder="성명" />
                  </div>
                  <div className="space-y-2">
                    <Label>학생2 기수</Label>
                    <Input value={student2Class} onChange={(e) => setStudent2Class(e.target.value)} placeholder="기수" />
                  </div>
                  <Button className="w-full" onClick={handleCreateReservation} disabled={createReservation.isPending}>
                    {createReservation.isPending ? "예약 중..." : "예약하기"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Room Headers */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            {rooms.map((room) => (
              <div key={room.id} className="text-center font-semibold text-foreground bg-primary/5 rounded-lg py-2 px-2">
                {room.roomNumber}호
              </div>
            ))}
          </div>

          {timeSlots.map((time) => (
            <div key={time} className="space-y-2">
              <div className="flex items-center gap-2 px-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground min-w-[80px]">{time}:00 - {time + 1}:00</span>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {rooms.map((room) => (
                  <div key={room.id} className="space-y-2">
                    {weekDays.map((day, dayIdx) => (
                      <Card key={dayIdx} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-center">
                            <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ko })}</div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1 min-h-[120px]">
                          {reservations
                            .filter(
                              (r) =>
                                r.roomId === room.id &&
                                format(new Date(r.reservationDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd") &&
                                r.startTime === time
                            )
                            .map((reservation) => (
                              <div
                                key={reservation.id}
                                className="relative group bg-primary/10 border border-primary/30 rounded p-2 text-xs space-y-1 hover:bg-primary/20 transition-colors"
                              >
                                <div className="text-foreground/80">
                                  {reservation.student1?.name} ({reservation.student1?.classNumber})
                                </div>
                                <div className="text-foreground/80">
                                  {reservation.student2?.name} ({reservation.student2?.classNumber})
                                </div>
                                {mode === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteReservation(reservation.id)}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
