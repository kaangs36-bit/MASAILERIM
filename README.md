# Mesailerim

MRL Mobilya için Android ve Windows üzerinde çalışan personel, mesai, avans, yemek fişi, devamsızlık ve ödeme takip uygulaması.

## Telefon ve bilgisayar senkronizasyonu

Uygulamanın **Ayarlar** ekranından bir bulut hesabı oluşturun. Telefon ve bilgisayarda aynı e-posta ve şifreyle giriş yaptığınızda kayıtlar Supabase üzerinden otomatik eşitlenir. İnternet yokken kayıt girmeye devam edilebilir; bağlantı geri geldiğinde bekleyen değişiklikler gönderilir.

## GitHub üzerinden APK alma

1. GitHub'da **Actions** sekmesine girin.
2. **Android APK Oluştur** iş akışını açın.
3. Tamamlanan çalışmanın **Artifacts** bölümünden `MRL-Personel-Takip-APK` dosyasını indirin.
4. ZIP'i açın ve `app-debug.apk` dosyasını Android telefona kurun.

## Windows sürümü

GitHub Actions içindeki **Windows Uygulaması Oluştur** işleminin `Mesailerim-Windows` çıktısında kurulumsuz çalışan tek `Mesailerim.exe` dosyası bulunur.

## Yedekleme

Yerel kayıtlar cihazda da saklanır. Ayrıca Ayarlar bölümünden JSON yedeği indirilebilir ve geri yüklenebilir.
