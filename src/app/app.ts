import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  showAnnouncement = signal(true);
  cartCount = signal(0);

  dismissAnnouncement() {
    this.showAnnouncement.set(false);
  }
}
