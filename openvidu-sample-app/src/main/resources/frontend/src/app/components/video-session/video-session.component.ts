import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { OpenViduTokBox, SessionTokBox, PublisherTokBox } from 'openvidu-browser';

import { VideoSessionService } from '../../services/video-session.service';
import { AuthenticationService } from '../../services/authentication.service';

import { Lesson } from '../../models/lesson';

@Component({
    selector: 'app-video-session',
    templateUrl: './video-session.component.html',
    styleUrls: ['./video-session.component.css']
})
export class VideoSessionComponent implements OnInit {

    lesson: Lesson;

    OV: OpenViduTokBox;
    session: SessionTokBox;

    sessionId: string;
    token: string;

    cameraOptions: any;
    localParentId: string = 'local-stream';
    remoteParentId: string = 'remote-streams';

    localVideoActivated: boolean;
    localAudioActivated: boolean;
    videoIcon: string;
    audioIcon: string;
    fullscreenIcon: string;

    constructor(
        private location: Location,
        private authenticationService: AuthenticationService,
        private videoSessionService: VideoSessionService) { }


    OPEN_VIDU_CONNECTION() {

        // 0) Obtain 'sessionId' and 'token' from server
        // In this case, the method ngOnInit takes care of it

        // 1) Initialize OpenVidu and your Session
        this.OV = new OpenViduTokBox("wss://" + location.hostname + ":8443/");
        this.session = this.OV.initSession(this.sessionId);

        // 2) Specify the actions when events take place
        this.session.on('streamCreated', (event) => {
            console.warn("Stream created:");
            console.warn(event.stream);
            this.session.subscribe(event.stream, this.remoteParentId);
        });

        // 3) Connect to the session
        this.session.connect(this.token, (error) => {
            if (!error) {
                // 4) Get your own camera stream with the desired resolution and publish it, only if the user is supposed to do so
                let publisher = this.OV.initPublisher(this.localParentId, this.cameraOptions);
                // 5) Publish your stream
                this.session.publish(publisher);
            }
            else {
                return console.log("There was an error: " + error);
            }

        });

    }


    ngOnInit() {

        // Specific aspects of this concrete application
        this.previousConnectionStuff();


        if (this.authenticationService.isTeacher()) {

            // If the user is the teacher: creates the session and gets a token (with PUBLISHER role)
            this.videoSessionService.createSession(this.lesson.id).subscribe(
                sessionId => {
                    this.sessionId = sessionId;
                    this.videoSessionService.generateToken(this.lesson.id).subscribe(
                        sessionIdAndToken => {
                            this.token = sessionIdAndToken[1];
                            console.warn("Token: " + this.token);
                            console.warn("SessionId: " + this.sessionId);
                            this.OPEN_VIDU_CONNECTION();
                        },
                        error => {
                            console.log(error);
                        });
                },
                error => {
                    console.log(error);
                }
            );
        }
        else {

            // If the user is a student: gets a token (with SUBSCRIBER role)
            this.videoSessionService.generateToken(this.lesson.id).subscribe(
                sessionIdAndToken => {
                    this.sessionId = sessionIdAndToken[0];
                    this.token = sessionIdAndToken[1];
                    console.warn("Token: " + this.token);
                    console.warn("SessionId: " + this.sessionId);
                    this.OPEN_VIDU_CONNECTION();
                },
                error => {
                    console.log(error);
                });
        }


        // Specific aspects of this concrete application
        this.afterConnectionStuff();
    }

    ngAfterViewInit() {
        this.toggleScrollPage("hidden");
    }

    ngOnDestroy() {
        this.videoSessionService.removeUser(this.lesson.id).subscribe(
            response => {
                console.warn("You have succesfully left the lesson");
            },
            error => {
                console.log(error);
            });
        this.toggleScrollPage("auto");
        this.exitFullScreen();
        if (this.OV) this.session.disconnect();
    }

    toggleScrollPage(scroll: string) {
        let content = <HTMLElement>document.getElementsByClassName("mat-sidenav-content")[0];
        content.style.overflow = scroll;
    }

    exitFullScreen() {
        let document: any = window.document;
        let fs = document.getElementsByTagName('html')[0];
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    previousConnectionStuff() {
        this.lesson = this.videoSessionService.lesson;
        this.cameraOptions = this.videoSessionService.cameraOptions;
    }

    afterConnectionStuff() {
        this.localVideoActivated = this.cameraOptions.video;
        this.localAudioActivated = this.cameraOptions.audio;
        this.videoIcon = this.localVideoActivated ? "videocam" : "videocam_off";
        this.audioIcon = this.localAudioActivated ? "mic" : "mic_off";
        this.fullscreenIcon = "fullscreen";
    }

}