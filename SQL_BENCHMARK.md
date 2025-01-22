```bash
$ docker ps
# copy the postgresql.conf file from the container to the host
$ docker cp my_postgres:var/lib/postgresql/data/postgresql.conf ./postgresql.conf
# edit the postgresql.conf file with the following content
$ vi postgresql.conf
```
```bash
# Enable logging
logging_collector = on

# Log all queries
log_statement = 'all'

# uncomment this
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_destination = 'stderr'

# enable duration logging
log_duration = on
```
```bash
# copy the postgresql.conf file back to the container
$ docker cp ./postgresql.conf my_postgres:var/lib/postgresql/data/postgresql.conf 
# restart the container
$ docker restart my_postgres
# get the most recent log file
$ docker exec -it my_postgres bash
$ cd  /var/lib/postgresql/data/log
$ tail +1f (most-recent-file)
```