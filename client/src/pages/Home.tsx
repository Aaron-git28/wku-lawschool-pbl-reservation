// import { useAuth } from "@/_core/hooks/useAuth"; // 로그인 제거
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { format, addDays, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, LogOut, Plus, Trash2, User } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Home() {
  // 로그인 없이 누구나 접근 가능하도록 수정
  // const { user, loading, isAuthenticated, logout } = useAuth();
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
      // 주간 전체 예약 데이터 새로고침
      const start = startOfWeek(reservationDate || new Date(), { weekStartsOn: 1 });
      const days = Array.from({ length: 6 }, (_, i) => addDays(start, i));
      days.forEach((day) => {
        utils.reservation.getByDate.invalidate({ date: format(day, "yyyy-MM-dd") });
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteReservation = trpc.reservation.delete.useMutation({
    onSuccess: () => {
      toast.success("예약이 취소되었습니다.");
      // 주간 전체 예약 데이터 새로고침
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 6 }, (_, i) => addDays(start, i));
      days.forEach((day) => {
        utils.reservation.getByDate.invalidate({ date: format(day, "yyyy-MM-dd") });
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedRoom(null);
    setSelectedTime(null);
    setStudent1Name("");
    setStudent1Class("");
    setStudent2Name("");
    setStudent2Class("");
    setReservationDate(null);
  };

  const handleSubmit = () => {
    if (!selectedRoom || selectedTime === null || !reservationDate) {
      toast.error("유효한 스터디룸과 시간을 선택해주세요.");
      return;
    }

    if (!student1Name || !student1Class || !student2Name || !student2Class) {
      toast.error("모든 학생 정보를 입력해주세요.");
      return;
    }

    // 로컬 타임존 기준으로 날짜 문자열 생성
    const year = reservationDate.getFullYear();
    const month = String(reservationDate.getMonth() + 1).padStart(2, '0');
    const day = String(reservationDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    createReservation.mutate({
      roomId: selectedRoom,
      date: dateStr,
      startTime: selectedTime,
      student1Name,
      student1Class,
      student2Name,
      student2Class,
    });
  };

  const handleDeleteReservation = (id: number) => {
    if (confirm("정말 이 예약을 취소하시겠습니까?")) {
      deleteReservation.mutate({ id });
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

  // 로그인 없이 누구나 접근 가능하므로 로딩 및 인증 체크 제거

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
                <p className="text-sm text-muted-foreground">스터디룸 예약 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
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
              <h2 className="text-2xl font-bold text-foreground">
                {format(weekStart, "yyyy년 M월", { locale: ko })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, "M월 d일", { locale: ko })} - {format(weekDays[5]!, "M월 d일", { locale: ko })}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToToday} size="sm">
              오늘
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  예약하기
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>스터디룸 예약</DialogTitle>
                  <DialogDescription>2명의 학생 정보를 입력하여 예약하세요.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {weekDays.map((day, idx) => {
                        const isDisabled = false;
                        const isSelected = reservationDate && format(reservationDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                        return (
                          <Button
                            key={idx}
                            variant={isSelected ? "default" : "outline"}
                            disabled={isDisabled}
                            onClick={() => setReservationDate(day)}
                            className="flex flex-col items-center p-2 h-auto"
                          >
                            <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ko })}</div>
                            <div className="font-semibold">{format(day, "d")}</div>
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
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>학생 1 - 성명</Label>
                      <Input value={student1Name} onChange={(e) => setStudent1Name(e.target.value)} placeholder="홍길동" />
                    </div>
                    <div className="space-y-2">
                      <Label>학생 1 - 기수</Label>
                      <Input value={student1Class} onChange={(e) => setStudent1Class(e.target.value)} placeholder="1기" />
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>학생 2 - 성명</Label>
                      <Input value={student2Name} onChange={(e) => setStudent2Name(e.target.value)} placeholder="김철수" />
                    </div>
                    <div className="space-y-2">
                      <Label>학생 2 - 기수</Label>
                      <Input value={student2Class} onChange={(e) => setStudent2Class(e.target.value)} placeholder="2기" />
                    </div>
                  </div>
                  <Button className="w-full mt-6" onClick={handleSubmit} disabled={createReservation.isPending}>
                    {createReservation.isPending ? "예약 중..." : "예약 완료"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "80px repeat(6, 1fr)" }}>
          {/* Header Row - Empty cell + Days */}
          <div></div>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={`text-center py-3 rounded-lg ${
                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground"
              }`}
            >
              <div className="text-sm font-medium">{format(day, "EEE", { locale: ko })}</div>
              <div className="text-lg font-bold">{format(day, "d")}</div>
            </div>
          ))}

          {/* Time Slots */}
          {timeSlots.map((time) => (
            <>
              <div key={`time-${time}`} className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {time}:00
              </div>
              {weekDays.map((day, dayIdx) => (
                <div key={`${time}-${dayIdx}`} className="min-h-[120px]">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-3 h-full">
                      <div className="space-y-2">
                        {rooms.map((room) => {
                          const reservation = reservations.find(
                            (r) =>
                              r.roomId === room.id &&
                              r.startTime === time &&
                              format(new Date(r.reservationDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                          );

                          if (reservation) {
                            return (
                              <div
                                key={room.id}
                                className="bg-primary/10 border border-primary/20 rounded-md p-2 text-xs relative group"
                              >
                                <div className="font-semibold text-primary mb-1">{room.roomNumber}호</div>
                                <div className="text-foreground/80">
                                  {reservation.student1?.name} ({reservation.student1?.classNumber})
                                </div>
                                <div className="text-foreground/80">
                                  {reservation.student2?.name} ({reservation.student2?.classNumber})
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteReservation(reservation.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <div key={room.id} className="text-xs text-muted-foreground/50 px-2">
                              {room.roomNumber}호
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          ))}
        </div>
      </main>
    </div>
  );
}
