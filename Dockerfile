FROM centos:7.2.1511
COPY . /home/topcoder/app/
RUN curl --silent --location https://rpm.nodesource.com/setup_6.x | bash - \
&& yum -y install nodejs \
&& useradd topcoder \
&& chown -R topcoder:topcoder /home/topcoder
USER topcoder
WORKDIR /home/topcoder/app/
RUN npm install
EXPOSE 8080
CMD npm run dev